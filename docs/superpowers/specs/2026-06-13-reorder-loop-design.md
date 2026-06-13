# Spec — Loop de re-orden (v1)

**Fecha:** 2026-06-13
**Origen:** Auditoría 2026-06-12 (hallazgo estratégico del consejo — el loop de re-orden figura como entregable cerrado de Fase 2 pero no existe en código: `grep reorder|buy again|... = 0 hits`). Acción #10 del Top 10.
**Negocio:** B2B mayorista Pi-Power, compradores profesionales que re-ordenan. Es el flujo que justifica el modelo de negocio.

## Objetivo

Permitir que un comprador repita un pedido pasado en un clic: las líneas del pedido se agregan al carrito actual (con el precio de hoy), se omite con aviso lo que ya no es viable, y el comprador revisa en `/cart` antes de pagar. Reusa el flujo de carrito y checkout existente; no crea pedidos directamente.

## Decisiones de diseño (cerradas)

1. **Qué produce:** agrega las líneas al carrito actual y lleva a `/cart` a revisar. No reemplaza el carrito ni va directo a checkout.
2. **Items no viables:** agrega lo disponible (ajustando cantidad al stock si hay menos) y avisa qué se omitió y por qué. No es "todo o nada".
3. **Alcance v1:** botón "Volver a pedir" en `/orders` (lista) y `/orders/[id]` (detalle) + CTA en el email `ORDER_PLACED` que linkea al detalle del pedido (el email no ejecuta la acción).

## Arquitectura

### Módulo `modules/reorder` (nuevo, una sola responsabilidad)

API expuesta solo vía `modules/reorder/index.ts`:

```ts
reorderService.reorderToCart(input: ReorderInput): Promise<ReorderResult>

type ReorderInput = { orderId: string; userId: string; orgId: string }

type ReorderResult = {
  added: AddedLine[]
  skipped: SkippedLine[]
}
type AddedLine = { productId: string; name: string; requestedQty: number; addedQty: number }
type SkippedLine = { productId: string; name: string; reason: SkipReason }
type SkipReason = 'inactive' | 'no_access' | 'out_of_stock'
```

Dependencias: orders (leer el pedido y sus líneas), catalog (estado/acceso/stock del producto), cart (`cartService.addItem`). El precio y el gate de verificación de org los maneja `addItem` (re-snapshot a precio de hoy + `isVerified`). El módulo se mantiene cerrado; otros importan solo desde `modules/reorder`.

### Flujo de `reorderToCart`

1. **Authz:** cargar el pedido; si no existe o `order.organizationId !== orgId` → `OrderNotFoundError` (error **nuevo**, definido en `modules/reorder/errors.ts` — el módulo orders no lo tiene hoy). Nadie re-pide el pedido de otra org.
2. Para cada línea del pedido, resolver el producto actual y evaluar en orden:
   - producto inactivo → `skipped: 'inactive'`
   - org sin acceso al producto hoy (catálogo privado; misma lógica de acceso que el storefront, p. ej. `filterForOrg`/`filterAccessibleIds`) → `skipped: 'no_access'`
   - `stock <= 0` → `skipped: 'out_of_stock'`
   - `0 < stock < requestedQty` → `added` con `addedQty = stock` (parcial)
   - disponible completo → `added` con `addedQty = requestedQty`
3. Para cada línea viable: `cartService.addItem({ userId, productId, quantity: addedQty, orgId })`.
   - `addItem` hace **upsert** (fija la cantidad, no suma). Si el producto ya estaba en el carrito, queda en la cantidad del pedido re-pedido. El comprador lo revisa en `/cart`.
4. Devolver `{ added, skipped }`.

### Server action `reorderAction(orderId)`

Fino (sin lógica de negocio — la auditoría marcó server actions gordos como deuda). Resuelve `userId`/`orgId` de la sesión/org activa, llama `reorderService.reorderToCart`, y **devuelve** el `ReorderResult` al cliente (patrón `useActionState`). No redirige desde el server: el cliente decide.
- Errores tipados (`OrderNotFoundError`, `ORG_NOT_VERIFIED`) → mapeados a message keys (sigue el patrón de CAL-1, con `logger.error` antes de devolver el error).

### UI

- **`/orders` (lista):** botón secundario "Volver a pedir" por fila.
- **`/orders/[id]` (detalle):** botón prominente "Volver a pedir".
- **Cliente:** al recibir el resultado, si hay `added` → toast con resumen de omitidos (si los hay) y `router.push('/cart')`. Si `added` está vacío → no navega; muestra aviso "ninguno de los productos de este pedido está disponible para re-pedir" con los motivos. Nada de nombres de producto en la URL.
- **Email `ORDER_PLACED`:** CTA secundario "Volver a pedir" → `href` a `/orders/[id]`. No ejecuta la acción; solo lleva al botón in-app.

### i18n

Claves nuevas EN/ES: label del botón, los 3 motivos de omisión (`inactive`/`no_access`/`out_of_stock`), aviso de "nada disponible", y el resumen del toast. Siguen el sistema i18n existente.

## Manejo de errores

| Caso | Comportamiento |
|------|----------------|
| Pedido inexistente o de otra org | `OrderNotFoundError` → toast de error, no navega |
| Todo omitido (added vacío) | No navega a `/cart`; aviso con motivos |
| Org no verificada | El botón no se muestra (defensa en UI) + el action devuelve el mensaje de verificación si se invoca igual |
| Falla parcial de `addItem` en una línea | Se registra y esa línea cuenta como omitida; el resto continúa |

## Testing (TDD)

**Unit `modules/reorder`:**
- todo disponible → `added` = todas las líneas, `skipped` vacío
- una línea inactiva → esa va a `skipped: 'inactive'`
- stock parcial → `addedQty = stock`
- sin acceso (org perdió acceso) → `skipped: 'no_access'`
- todo no disponible → `added` vacío
- authz: pedido de otra org → `OrderNotFoundError`

**e2e:**
- colocar pedido → "Volver a pedir" → aterriza en `/cart` con los items
- caso con item sin stock → muestra el aviso de omitido
- corre contra el build de producción (TST-6) además de dev

## Fuera de alcance (v1, YAGNI)

- Affordance permanente de "re-pedir" en el header (va con la unificación del header).
- Re-orden desde el admin.
- Selección de qué líneas re-pedir (la v1 re-pide el pedido completo menos lo no viable).
- Sumar a la cantidad existente del carrito en vez de fijarla (se evaluará si los datos lo piden).
