# ADR 0034 — Onboarding B2B: catálogo público, precio + compra gated por verificación manual

Fecha: 2026-06-02

## Estado

Aceptado. Implementado en branch `feature/onboarding-b2b`.

## Contexto

Hasta Fase 5 sólo el admin podía dar de alta una org y subir certificado. La
verificación se auto-aprobaba al subir el cert. Falta la puerta de entrada
self-service para clientes nuevos.

Además, gateaar todo el storefront detrás de login + verificación pierde el
SEO/discovery que Fase 4 dejó (contenido AI bilingüe + metadata + sitemap).

## Decisión

- **Auto-registro + aprobación manual del admin** (revisión de decisión Fase 5
  de auto-aprobación). Negocio se registra, sube certificado, queda
  `PENDING`; admin aprueba o rechaza desde `/admin/customers`.
- **Catálogo, búsqueda y PDPs públicos** (sin login). Renderizan specs +
  contenido AI; no muestran precio para anónimos ni para orgs pending/rejected.
  Sólo orgs `VERIFIED` ven precio y botón "Agregar al carrito".
- **Compra/cuenta gated**: cart, checkout, orders, quotes, invoices,
  approvals, notifications requieren login + org `VERIFIED`. Guard RSC
  `requireVerifiedCustomer()`.
- **Defensa en profundidad**: `cartService.addItem` rechaza orgs no-VERIFIED
  (no sólo el botón). `checkoutService.confirm` ya lo hacía desde Fase 5.
- **Onboarding self-service**: una sola página en `/onboarding` con datos
  del negocio + subida de certificado. `submitOnboardingAction` crea org
  PENDING + OWNER member + default address + sube cert a R2 (Fake si no hay
  claves). Redirect a `/onboarding/pending`.
- **Re-upload tras rechazo**: form de re-envío en `/onboarding/pending` para
  orgs REJECTED. Vuelve a `PENDING` y limpia `rejectionReason`.
- **Email subscriber**: `customer.verified` → `CUSTOMER_APPROVED`,
  `customer.rejected` → `CUSTOMER_REJECTED` con motivo.

## Schema delta

- `Organization.verificationSubmittedAt DateTime?` (cuándo se envió a revisión).
- `Organization.rejectionReason String?` (motivo si REJECTED).
- `NotificationType` +2 valores (`CUSTOMER_APPROVED`, `CUSTOMER_REJECTED`).
- Event contract v1 + `customer.rejected` (aditivo).

## API de `modules/verification`

- `uploadCertificate(input)` — sube a R2 + TaxDocument UPLOADED + org →
  PENDING + `verificationSubmittedAt = now` + limpia `rejectionReason`.
  No emite eventos (sin auto-approve).
- `approveOrganization({orgId, byAdminId})` — VERIFIED + taxExempt + marca
  TaxDocs UPLOADED → APPROVED + emite `customer.verified`.
- `rejectOrganization({orgId, byAdminId, reason})` — REJECTED + reason +
  marca TaxDocs → REJECTED + emite `customer.rejected`. Reason vacío → throw.
- `uploadAndAutoApprove(input)` — compat con UI admin (compone los dos
  anteriores).

## API de `modules/customers`

- `createOrganizationWithOwner({userId, name, country, address})` — tx que
  crea org PENDING + OWNER + default-billing/shipping. Slug auto-generado
  (slugify + random suffix).

## Consecuencias

- **SEO conservado**: la landing nueva + catálogo + PDPs siguen indexables
  con metadata y contenido AI; sólo el precio queda fuera de vista para anon.
- **Conversión**: los CTAs "Iniciá sesión para ver precios" desde la PDP
  conducen al sign-in/onboarding, separando el descubrimiento de la barrera
  comercial.
- **Compliance**: el admin sigue siendo la última palabra sobre quién compra
  (no se auto-aprueba). Se mantiene la opción de revocar después.
- **Ops**: cada nueva org requiere un admin que revise. Si el volumen escala,
  agregar SLA (ej: aprobación en 1 día hábil) y notificación a admin cuando
  hay pendientes (ya está vía el badge en `/admin/customers`).

## Alternativas descartadas

- **Auto-aprobación al subir cert** (decisión Fase 5): se descarta a favor
  de manual. La verificación externa (validar el cert contra organismos
  estatales) sigue siendo YAGNI.
- **Gating completo del storefront**: pierde SEO de Fase 4. Mejor descubrir
  → registrar → comprar.
- **Multi-org en el form de onboarding**: una sola org por usuario en el
  alta. Unirse a otra org sigue siendo vía invitaciones (Fase 1).
