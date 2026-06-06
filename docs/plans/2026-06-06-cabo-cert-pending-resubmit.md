# Cabo — re-subida de cert en /onboarding/pending para PENDING-sin-cert

> Brief Cowork → Claude Code CLI. Tarea chica, acotada, TDD. **Branch nueva desde `main` actualizado.** Gate verde obligatorio; si algo sale rojo, **frenar y reportar, no continuar** (regla del proyecto).

## Problema

`app/(onboarding)/onboarding/pending/page.tsx` muestra el formulario de re-subida de certificado **sólo cuando `verificationStatus === 'REJECTED'`**. Una org en **`PENDING` que no tiene certificado cargado** (onboarding interrumpido, o el upload inicial falló) queda atascada: ve el mensaje "estamos revisando" pero no hay nada que revisar ni forma de subir el cert.

## Estado verificado del código (no re-implementar)

- `Organization.taxDocuments TaxDocument[]` (schema L138). Org sin cert = `taxDocuments` vacío.
- `resubmitCertificateAction` (en `app/(onboarding)/onboarding/_actions.ts`) **ya hace el upload genérico** para la org del usuario (valida type/number/jurisdiction/file, llama `uploadCertificate`, redirige a `/onboarding/pending` con toast). **Es reusable tal cual** — no cambia.
- El form de cert (type select + jurisdiction + number + file) ya existe en la rama `REJECTED` de la misma página. Reusar esa estructura.

## Cambio

En `pending/page.tsx`:

1. Extender el `select` del query para traer el conteo de certificados:
   ```ts
   organization: { select: { id:true, name:true, verificationStatus:true, rejectionReason:true, verificationSubmittedAt:true, _count: { select: { taxDocuments: true } } } }
   ```
2. Calcular `const hasCert = org._count.taxDocuments > 0`.
3. Lógica de render para `PENDING`:
   - **`PENDING` && `!hasCert`** → renderizar el **formulario de subida** (mismos campos, `action={resubmitCertificateAction}`) con copy que explique que falta el certificado. NO mostrar el mensaje "bajo revisión".
   - **`PENDING` && `hasCert`** → comportamiento actual (mensaje "bajo revisión" + submittedOn). Sin form.
   - `REJECTED` → sin cambios.
4. Verificar que `uploadCertificate` (modules/verification) no rompe si la org ya está `PENDING` (el path REJECTED→PENDING ya existe; confirmar que PENDING→PENDING es idempotente y no tira). Si tira, ajustar en el módulo con su test.

## i18n (parity EN/ES obligatoria — el test rompe build si falta una)

Agregar en `lib/i18n/messages.ts` (union type + en-US + es-419):

| key | en-US | es-419 |
|---|---|---|
| `onboarding.pending.noCert.intro` | We don't have your tax certificate yet. Upload it to start verification. | Todavía no tenemos tu certificado fiscal. Subilo para iniciar la verificación. |
| `onboarding.pending.noCert.submit` | Upload certificate | Subir certificado |

Reusar las keys existentes `onboarding.cert.type`, `onboarding.cert.type.us`, `onboarding.cert.type.foreign`, `onboarding.cert.jurisdiction`, `onboarding.cert.jurisdictionPlaceholder`, `onboarding.cert.number`, `onboarding.cert.file`, `onboarding.cert.fileHint`, `onboarding.sending`.

## TDD

Primero el test, verlo fallar, implementar, verlo pasar. Seguir el patrón existente (`tests/e2e/onboarding.spec.ts` o un test de página si encaja mejor):

- **Caso 1:** org `PENDING` **sin** taxDocuments → la página renderiza el form de subida (input `name="file"` presente).
- **Caso 2:** org `PENDING` **con** ≥1 taxDocument → NO renderiza el form; muestra el mensaje de revisión.
- (Regresión) `REJECTED` sigue mostrando su form.

Si hace falta seed: una org PENDING sin cert. Reusar helpers de seed/factory existentes; no inventar infraestructura nueva.

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` (Biome, no Prettier).
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — todo verde, incluido el test de paridad EN/ES.
3. Sin tocar `MAINTENANCE_MODE`. Sin tocar adaptadores ni lógica de pagos.
4. Commit chico: `feat(onboarding): allow cert upload for PENDING orgs without a certificate`. Push a la branch + abrir PR. **No mergear** — Herney revisa en Cowork.
