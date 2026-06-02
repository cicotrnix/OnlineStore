# Runbook — Onboarding B2B (revisión manual)

## Flujo de alta del cliente

1. Cliente entra al sitio (`/`). Ve landing con CTA "Registrá tu negocio" →
   `/onboarding` (requiere estar logueado, redirige a `/sign-in` si no).
2. Recibe magic link de Resend, ingresa a `/onboarding`.
3. Completa form en una sola página:
   - Razón social
   - País (ISO-2)
   - Dirección (line1, line2 opcional, city, state opcional, postalCode)
   - Tipo de certificado (US_RESALE_CERT / FOREIGN_EQUIV)
   - Número del certificado
   - Jurisdicción (TX, FL, …)
   - Archivo PDF/imagen ≤10 MB
4. Submit → crea Organization PENDING + OWNER member + default address +
   sube archivo a R2 (Fake si no hay claves) + crea TaxDocument UPLOADED →
   redirect a `/onboarding/pending`.
5. Cliente ve "Tu cuenta está en revisión". Puede explorar el catálogo
   (precios ocultos hasta aprobación).

## Flujo de aprobación del admin

1. Admin entra a `/admin/customers?status=pending` (filtro tab pre-seleccionado
   por defecto; PENDING aparecen primero por sort).
2. Click en la org → `/admin/customers/<id>`.
3. Card "Verificación B2B":
   - **Ver certificado** → genera signed URL R2 + redirect al PDF (TTL 15
     min, sólo admin).
4. Decide:
   - **Aprobar** → click "Aprobar" → org pasa a VERIFIED + taxExempt +
     emite `customer.verified` → email `CUSTOMER_APPROVED` al/los miembros.
   - **Rechazar** → escribe motivo en el input → click "Rechazar" → org pasa
     a REJECTED + guarda `rejectionReason` + emite `customer.rejected` →
     email `CUSTOMER_REJECTED` con motivo.
5. Cliente recibe email + ve el estado actualizado en `/onboarding/pending`.

## Flujo de re-envío tras rechazo

1. Cliente vuelve a `/onboarding/pending`, ve motivo de rechazo.
2. Form de re-upload: tipo + número + jurisdicción + archivo.
3. Submit → `uploadCertificate` (limpia `rejectionReason`, marca PENDING) →
   redirect a `/onboarding/pending` con badge actualizado.
4. Admin recibe la org de nuevo en filtro PENDING.

## Métricas a observar

```sql
-- Backlog pendiente
SELECT COUNT(*) FROM "Organization" WHERE "verificationStatus" = 'PENDING';

-- Tiempo promedio de aprobación (en orgs verificadas)
SELECT AVG(EXTRACT(EPOCH FROM ("verifiedAt" - "verificationSubmittedAt"))) / 3600 AS avg_hours
FROM "Organization" WHERE "verificationStatus" = 'VERIFIED' AND "verificationSubmittedAt" IS NOT NULL;

-- Tasa de rechazo
SELECT
  COUNT(*) FILTER (WHERE "verificationStatus" = 'REJECTED')::float
  / NULLIF(COUNT(*) FILTER (WHERE "verificationStatus" IN ('VERIFIED', 'REJECTED')), 0)
  AS rejection_rate
FROM "Organization";
```

Alarma sugerida (Uptime Kuma / Sentry):
- Backlog PENDING > 20 → notificar a Herney por email/Slack.
- Tiempo promedio de aprobación > 48h → revisar capacidad de revisión.

## Revocar verificación

Si después de aprobar el cliente resulta inválido (cert vencido, fraude, etc):

```sql
UPDATE "Organization"
SET "verificationStatus" = 'REJECTED',
    "rejectionReason" = '<motivo>',
    "taxExempt" = false
WHERE id = '<orgId>';
```

(No hay UI para revocar todavía — agregar si se vuelve frecuente. El client
state cae a REJECTED automáticamente al próximo request; el carrito existente
queda inutilizable porque `checkoutService.confirm` lo rechaza.)

## Tests

- `modules/verification/__tests__/service.test.ts` — split + reject flows.
- `modules/customers/__tests__/onboarding.test.ts` — createOrganizationWithOwner.
- `modules/cart/__tests__/gate.test.ts` — addItem rechaza no-VERIFIED.
- `app/(onboarding)/__tests__/actions.test.ts` — submitOnboarding + resubmit.
- `app/admin/__tests__/approve-reject-actions.test.ts` — admin approve/reject.
- `tests/e2e/onboarding.spec.ts` — público vs gated.
