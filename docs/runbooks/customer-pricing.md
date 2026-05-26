# Runbook · Precios por cliente

Cómo configurar precios negociados (override) para una organización cliente.

## Cuándo aplica

- Cliente firmó contrato anual con descuento sobre ciertos SKUs.
- Cliente estratégico que merece precio especial.
- Volumen mínimo garantizado.

## Cómo configurar

1. `/admin/customers` → buscar la org.
2. Click en la org → `/admin/customers/[id]`.
3. Click "Gestionar precios" → `/admin/customers/[id]/prices`.
4. Tabla lista todos los productos con su precio base + input para override.
5. Ingresar precio (con 2 decimales) y "Guardar" por producto.

El sistema hace upsert sobre `(organizationId, productId)`. Reaplicar sobrescribe.

## Verificar

Iniciar impersonation a esa org:

1. `/admin/customers/[id]` → "Ver storefront como esta org".
2. `/catalog` muestra precios con badge "Tu precio" en SKUs override.
3. Click producto: precio override displayado, precio base tachado.

## Vigencia (validFrom/validUntil)

UI actual no expone `validFrom/validUntil` aún (Fase 1 maneja overrides permanentes). Para precios temporales: usar `prisma studio`:

```bash
pnpm db:studio
```

Editar `CustomerPrice` y setear `validFrom`/`validUntil`. `pricingService.resolveForOrg` los respeta automáticamente.

## Eliminar override

UI actual no expone delete (Fase 1). Vía Studio o SQL:

```sql
DELETE FROM "CustomerPrice"
WHERE "organizationId" = '<orgId>' AND "productId" = '<productId>';
```

Después del delete, el cliente vuelve a ver el precio base inmediatamente (sin cache).

## Bulk import (futuro)

Importación CSV de overrides en bulk → Fase 2.
