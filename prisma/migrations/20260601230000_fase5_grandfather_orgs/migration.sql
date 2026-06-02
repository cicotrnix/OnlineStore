-- Fase 5 go-live safety: orgs creadas antes de Fase 5 deben quedar VERIFIED
-- para que el gate de checkout.confirm() no rompa la tienda viva. Las orgs
-- nuevas creadas post-deploy seguirán el flujo de verificación normal
-- (default PENDING en la columna).
--
-- Estrategia: cualquier Organization con verificationStatus = PENDING en este
-- momento se grandfather a VERIFIED. Si Herney quiere revisar/revocar después,
-- puede hacerlo desde admin.

UPDATE "Organization"
SET
  "verificationStatus" = 'VERIFIED',
  "verifiedAt"         = COALESCE("verifiedAt", NOW()),
  "country"            = COALESCE("country", 'US'),
  "taxExempt"          = COALESCE("taxExempt", true)
WHERE "verificationStatus" = 'PENDING';
