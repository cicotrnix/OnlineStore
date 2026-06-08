# Checklist ejecutable — Go-live Fase 5 (pipower.shop)

> Derivado de `fase5-go-live.md`. Convierte el encendido A→F en pasos accionables con su **smoke test** y **gate verde** antes de pasar a la siguiente fase. Marcá cada `[ ]` al completarlo.
>
> **Premisa confirmada (2026-06-06):** el **código de los 4 adaptadores reales ya está implementado y testeado** (R2Storage, RealFedex, RealStripe, PosthogGa4Analytics) con patrón selector env-var → real / Fake. Por eso cada fase es **provisionar + smoke**, no implementar. Lo que sigue es trabajo de **Herney (cuentas, claves, Coolify)**; CC no interviene salvo donde se indique.
>
> **Regla de oro:** una fase no se enciende hasta que la anterior pasó su smoke. Si algo rompe la tienda → rollback (sección final). `MAINTENANCE_MODE` sigue `on` hasta terminar todo (decisión: lanzar recién con todas las fases + Fase 6 cerradas).

## Pre-flight (una vez)

- [ ] Confirmar deploy actual en Coolify = `origin/main` post-merge (commit `3c1f545` o posterior).
- [ ] Confirmar migraciones corrieron al boot (10 aditivas Fase 5) — sin errores en logs.
- [ ] `RESEND_API_KEY` ya presente (Fase 0) → email real disponible cuando se necesite.
- [ ] Tener a mano `docs/runbooks/append-only-db-hardening.md` y `ops/coolify-scheduled-tasks.md`.

---

## Fase A — Verificación B2B + Contabilidad (riesgo bajo, sin dinero)

**Provisioning**
- [ ] Aplicar `ops/sql/2026-06-01-create-app-rw-role.sql` (runbook `append-only-db-hardening.md`).
- [ ] Crear bucket privado en **Cloudflare R2** (o Hetzner Object Storage S3-compatible).
- [ ] Generar Access Key ID + Secret.
- [ ] Setear en Coolify: `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` → redeploy.
- [ ] Habilitar scheduled tasks en Coolify (ver `ops/coolify-scheduled-tasks.md`):
  - [ ] `process-domain-events` — `* * * * *`
  - [ ] `cleanup-domain-events` — `0 3 * * 0`

**Smoke (gate)**
- [ ] Admin sube un certificado de prueba en `/admin/customers/<id>` (tipo + número + jurisdicción + país + archivo) → no error.
- [ ] "Ver certificado" devuelve una URL firmada R2 que abre el archivo (no `fake://`).
- [ ] Crear una orden de prueba → en ~1 min aparece un asiento en el ledger (Dr CxC / Cr Ventas). Validar con `pnpm tsx scripts/trial-balance.ts` → débitos = créditos.
- [ ] ✅ Gate A verde antes de seguir.

---

## Fase B — Wire / ACH (riesgo medio, dinero manual)

**Provisioning**
- [ ] Confirmar número de cuenta bancaria operativa (`1010 Banco operativo USD`) visible para el equipo.
- [ ] Revisar template email `INVOICE_ISSUED`: subject + CTA correctos; info de wire en footer/cuerpo.

**Smoke (gate)**
- [ ] Orden nueva dispara `order.placed` + `invoice.issued` → email recibido (Resend real) con link a factura.
- [ ] Admin abre `/admin/orders/<id>`, completa "Conciliar wire / ACH" (monto + referencia) y submitea → orden refleja pago.
- [ ] `trial-balance.ts` sigue balanceado tras la conciliación.
- [ ] ✅ Gate B verde.

---

## Fase C — Envíos FedEx (riesgo bajo)

**Provisioning**
- [ ] Cuenta FedEx Business + API credentials.
- [ ] Setear en Coolify: `FEDEX_API_KEY`, `FEDEX_API_SECRET`, `FEDEX_ACCOUNT_NUMBER`, `FEDEX_METER_NUMBER`, `FEDEX_FROM_ZIP` (opcional `FEDEX_BASE_URL`) → redeploy.
- [ ] Revisar `HAZMAT_LIMITS` en `modules/shipments/service.ts` con valores reales DG (si difieren, es cambio de config → tarea CC chica).

**Smoke (gate)**
- [ ] Cotización real (`rate`) devuelve un monto FedEx Ground (no el Fake de 1200n + 50/lb).
- [ ] Un envío real con tracking ID válido (`buyLabel`) → label URL real.
- [ ] ✅ Gate C verde.

---

## Fase D — Webhooks salientes (riesgo bajo)

**Provisioning**
- [ ] Habilitar scheduled task `process-webhook-deliveries` — `* * * * *`.
- [ ] Admin crea el primer `WebhookEndpoint` para un cliente piloto.

**Smoke (gate)**
- [ ] El receptor valida la firma HMAC de una entrega.
- [ ] Monitorear `WebhookDelivery.status` 24 h sin FAILED inesperados.
- [ ] ✅ Gate D verde.

---

## Fase E — Analytics PostHog + GA4 (riesgo mínimo)

**Provisioning**
- [ ] Proyecto PostHog + property GA4.
- [ ] Setear en Coolify: `POSTHOG_API_KEY`, `POSTHOG_HOST` (default `https://us.i.posthog.com`), `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` → redeploy.

**Smoke (gate)**
- [ ] Primeros eventos visibles en los dashboards (deja de devolver Fake).
- [ ] ✅ Gate E verde.

---

## Fase F — Stripe Checkout (riesgo ALTO — LO ÚLTIMO, con staging)

**Provisioning + staging**
- [ ] Cuenta Stripe (test + live keys).
- [ ] **Segunda instancia Coolify (staging)** con dominio separado.
- [ ] En staging: `STRIPE_SECRET_KEY` (test) + `STRIPE_WEBHOOK_SECRET` (test) → redeploy.
- [ ] Webhook endpoint en Stripe Dashboard (test): `https://staging.../api/webhooks/stripe`. Eventos: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`.

**Validación PSDD §16 contra staging (test cards) — gate duro**
- [ ] Tarjeta exitosa → orden CONFIRMED + stock baja + asiento.
- [ ] Tarjeta declinada → status FAILED, sin baja de stock.
- [ ] Refund desde admin → REFUND_PENDING → webhook → REFUNDED + contra-ingreso 4100 / clearing 1200.
- [ ] ✅ Suite PSDD verde en staging.

**Producción (solo tras staging verde)**
- [ ] Live keys en prod (`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` live).
- [ ] Webhook endpoint live en Stripe Dashboard.
- [ ] Suite mínima en prod con un cargo real bajo (refundeado).
- [ ] Activar `store.config.ts` `payments.stripe.enabled = true` (commit + push) → aparece "Pagar con tarjeta" en `/orders/<id>` (gate `flag + PENDING_PAYMENT`).
- [ ] Documentar primer cargo live + verificar primer asiento real.
- [ ] ✅ Gate F verde.

---

## Cierre / launch

- [ ] (Si aplica la decisión) Fase 6 multi-tenant cerrada.
- [ ] Tachar capas encendidas + anotar "live since X" en `docs/runbooks/payments.md`.
- [ ] **Recién entonces:** `MAINTENANCE_MODE=off` + redeploy → pipower.shop público.

## Rollback global

1. Desactivar el flag en `store.config.ts` (commit+push) **o** vaciar la env var en Coolify + reiniciar → vuelven Fakes/noops.
2. Si la verificación bloquea a todos los buyers nuevos:
   ```sql
   UPDATE "Organization" SET "verificationStatus"='VERIFIED', "verifiedAt"=NOW() WHERE "verificationStatus"='PENDING';
   ```
3. Migraciones son aditivas — no hace falta rollback de schema.
