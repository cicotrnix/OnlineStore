# B6 — Instrucciones de pago wire/ACH en la factura (plumbing, datos diferidos)

> Brief Cowork → Claude Code CLI. Branch nueva desde `main`. TDD donde aplique. Gate verde. No mergear.
> **Objetivo:** dejar toda la estructura lista para mostrar instrucciones de transferencia en la factura, con los **datos bancarios vacíos** (Herney los completa cuando resuelva el tema de la cuenta KonLLC/DBA). Mientras no estén cargados, no se muestra nada a medias (gated).

## Contexto

Hoy: `store.config` solo tiene `payments.wire: { enabled }` opcional (schema `modules/config/schemas.ts:38`). La página `/invoices/[id]` no muestra instrucciones de pago. El email `INVOICE_ISSUED` linkea a la factura y tiene un texto raro ("Recibí instrucciones para tu wire/ACH"). No hay datos bancarios en ningún lado.

Decisión de negocio: launch wire-first. La entidad que recibe es KonLLC (marca PiPower) — el beneficiario se completa después (ej. "KonLLC dba PiPower"). Los datos de wire para *recibir* no son secretos (se comparten con quien paga), así que van en `store.config`.

## Cambio

### 1. Schema — `modules/config/schemas.ts`

Extender `payments.wire` de `{ enabled }` a incluir campos de instrucción **opcionales**:

```ts
wire: z
  .object({
    enabled: z.boolean(),
    beneficiaryName: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(), // ABA (US)
    swift: z.string().optional(),         // internacional
    accountType: z.string().optional(),   // checking / savings
    reference: z.string().optional(),     // ej. "Incluí tu número de orden en el memo"
    notes: z.string().optional(),         // texto libre extra
  })
  .optional(),
```

Todos opcionales → un config sin datos valida igual.

### 2. `store.config` de pipower — `stores/pipower/store.config.ts`

Agregar el bloque `wire` dentro de `payments`, **con datos vacíos y TODO**:

```ts
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false },
    // TODO(Herney): completar cuando esté resuelta la cuenta bancaria (KonLLC dba PiPower).
    // Mientras enabled sea false o falten beneficiaryName/accountNumber, NO se muestran instrucciones.
    wire: {
      enabled: false,
      beneficiaryName: '', // ej. 'KonLLC dba PiPower'
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      swift: '',
      accountType: '',
      reference: 'Incluí tu número de orden en el memo de la transferencia.',
      notes: '',
    },
  },
```

### 3. Helper de visibilidad

En `modules/config` (o junto al loader), exportar un helper:

```ts
export function wireInstructionsReady(cfg: StoreConfig): boolean {
  const w = cfg.payments.wire
  return !!(w?.enabled && w.beneficiaryName && w.accountNumber)
}
```

Regla: las instrucciones se muestran **solo** si `enabled` + `beneficiaryName` + `accountNumber` están. Así, con el config vacío de arriba, no se muestra nada hasta que Herney complete y ponga `enabled: true`.

### 4. Página de factura — `app/(storefront)/invoices/[id]/page.tsx`

Renderizar una sección **"Instrucciones de pago (transferencia / wire)"** que liste los campos presentes (beneficiario, banco, cuenta, routing, SWIFT si hay, tipo de cuenta, referencia, notas) — **solo si `wireInstructionsReady(getStoreConfig())`**. Si no está lista, no renderizar la sección (la factura sigue mostrándose normal). Usar `getStoreConfig()` (server component). Labels vía i18n.

### 5. Email `INVOICE_ISSUED` — `modules/notifications/email-subscriber.ts`

Arreglar el `body` (L75) a algo claro, p.ej.:
- en: "Your invoice is ready. See the payment instructions on the invoice."
- es: "Tu factura está lista. Mirá las instrucciones de pago en el detalle de la factura."

Mantener el link a `/invoices/{invoiceId}` y el CTA "Pay via wire" / "Pagar via wire" (ya existe). Las instrucciones completas viven en la página de factura, no en el email (evita mandar el número de cuenta por mail). Usar texto i18n según el locale del destinatario (ya hay patrón en el subscriber).

### 6. i18n — `lib/i18n/messages.ts`

Agregar keys (union type + en-US + es-419, paridad obligatoria) para los labels de la sección de instrucciones de la página de factura:

| key | en-US | es-419 |
|---|---|---|
| `invoice.wire.title` | Payment instructions (wire / ACH) | Instrucciones de pago (transferencia / wire) |
| `invoice.wire.beneficiary` | Beneficiary | Beneficiario |
| `invoice.wire.bank` | Bank | Banco |
| `invoice.wire.account` | Account number | Número de cuenta |
| `invoice.wire.routing` | Routing (ABA) | Routing (ABA) |
| `invoice.wire.swift` | SWIFT | SWIFT |
| `invoice.wire.accountType` | Account type | Tipo de cuenta |
| `invoice.wire.reference` | Reference | Referencia |

## TDD

- Unit de `wireInstructionsReady`: false si `enabled:false`; false si falta `beneficiaryName` o `accountNumber`; true si enabled + ambos presentes.
- Test de la página de factura (patrón `pending-page.test.tsx`): con `_setRegistry`/mock de config sin datos → la sección de wire **no** aparece; con datos completos + enabled → aparece con beneficiario y cuenta.

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` (Biome).
2. `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` — verde, incluido paridad EN/ES.
3. Con el `store.config` por defecto (wire vacío/`enabled:false`) → la factura **no** muestra instrucciones, nada roto; el email linkea a la factura con el texto corregido.
4. Verificación de que con datos de prueba completos + `enabled:true`, la sección **sí** aparece (test o manual).
5. Sin tocar `MAINTENANCE_MODE`, schema Prisma, adaptadores de pago.
6. Commit: `feat(payments): wire/ACH instructions on invoice (data-driven, gated)`. Push + PR. **No mergear** — review en Cowork.

## Para Herney (después del merge)

Cuando esté resuelta la cuenta: completar los campos en `stores/pipower/store.config.ts`, poner `wire.enabled: true`, commit + push → redeploy. Ahí recién aparecen las instrucciones en las facturas.
