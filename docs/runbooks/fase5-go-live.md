# Runbook — Go-live Fase 5

Orden de encendido controlado para Fase 5 en producción. La premisa es que el
deploy del código es **inerte** (todos los flags OFF / noop sin claves), y
Herney activa cada capacidad gradualmente con su propia ventana de validación.

## Estado tras merge a main + tag v5.0.0

- Código deployado a Coolify (auto-deploy en push a main).
- Migraciones Prisma corren al boot (10 migraciones nuevas, todas aditivas).
- Migración `fase5_grandfather_orgs` marca todas las orgs existentes como
  VERIFIED → checkout sigue funcionando sin gate breakage.
- Todos los clientes externos en Fake/noop:
  - `lib/stripe` → FakeStripe (sin `STRIPE_SECRET_KEY`).
  - `lib/fedex` → FakeFedex.
  - `lib/storage` → FakeStorage (in-memory).
  - `lib/analytics` → FakeAnalytics.
  - `lib/email/resend` → noop (sin `RESEND_API_KEY` ya configurado en Fase 0).
- Suscriptores del bus registrados pero inertes:
  - `accounting` — postea asientos siempre (no necesita claves).
  - `email` — sólo registra logs noop.
  - `analytics` — capture in-memory.
  - `webhooks` — enqueue a tabla vacía (sin `WebhookEndpoint`s = 0 entregas).
- Cron tasks pendientes de configurar en Coolify (`ops/coolify-scheduled-tasks.md`).

## Orden de encendido recomendado

### Fase A — Verificación B2B + Contabilidad (sin movimiento de dinero)

**Riesgo:** bajo. Sin cuentas externas. Solo encender el flujo de admin.

1. Aplicar `ops/sql/2026-06-01-create-app-rw-role.sql` (runbook
   `append-only-db-hardening.md`).
2. Habilitar scheduled tasks `process-domain-events` y
   `cleanup-domain-events`.
3. Provisionar **Cloudflare R2** (o Hetzner Object Storage):
   - Crear bucket privado.
   - Generar Access Key ID + Secret.
   - Configurar `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
     `R2_SECRET_ACCESS_KEY` en Coolify.
   - El `lib/storage` real (a implementar al reemplazar FakeStorage) detecta y
     usa el client S3-compatible.
4. Smoke test: admin sube un certificado de prueba en `/admin/customers/<id>`
   (form de verificación B2B: tipo + número + jurisdicción + país + archivo) →
   flujo emite `customer.verified`. Verifica con "Ver certificado" → genera
   URL firmada R2.
5. Coordinar con cada cliente B2B existente para que cargue su certificado real
   en `/admin` (Herney sigue siendo platform admin; los buyers no).

### Fase B — Wire / ACH (pagos manuales, sin Stripe)

**Riesgo:** medio. Movimiento de dinero real pero el procesamiento es manual.

1. Verificar que la cuenta bancaria operativa (`1010 Banco operativo USD`)
   tiene número visible para el equipo.
2. Email template `INVOICE_ISSUED` (Corte 5) — confirmar que el subject + CTA
   son correctos. El cuerpo lleva la URL a la factura; el wire info se anexa
   manual o en el footer del template.
3. Verificar `process-domain-events` está corriendo: orders nuevas deben
   disparar `order.placed` + `invoice.issued` → email → asiento Dr CxC / Cr
   Ventas en el ledger.
4. Coordinar reconciliación: admin recibe extracto bancario, abre
   `/admin/orders/<id>`, completa el form "Conciliar wire / ACH" (monto +
   referencia) y submitea.
5. Validar **trial balance** `pnpm tsx scripts/trial-balance.ts` (a crear si
   no existe) — débitos = créditos.

### Fase C — Envíos FedEx (USA Ground)

**Riesgo:** bajo. Cliente Fake si la API falla. Costos limitados (hazmat
limits enforced).

1. Provisionar **cuenta FedEx Business** + API credentials.
2. Configurar `FEDEX_API_KEY`, `FEDEX_ACCOUNT_NUMBER`, `FEDEX_METER_NUMBER`,
   `FEDEX_FROM_ZIP` en Coolify.
3. Reemplazar `lib/fedex/FakeFedex` con adaptador SDK real (no urgente — Fake
   permite UI funcional).
4. Ajustar `HAZMAT_LIMITS` (`modules/shipments/service.ts`) con valores reales
   de paperwork DG.
5. Test: un envío real con tracking ID válido.

### Fase D — Webhooks salientes (integraciones cliente)

**Riesgo:** bajo. Endpoints solo creados por admin; sin endpoints = 0 entregas.

1. Habilitar scheduled task `process-webhook-deliveries`.
2. Admin crea el primer `WebhookEndpoint` para un cliente piloto.
3. Validar firma HMAC desde el receptor.
4. Monitorear `WebhookDelivery.status` por 24 h.

### Fase E — Analytics PostHog + GA4

**Riesgo:** mínimo. Solo telemetría server-side, no afecta UX.

1. Provisionar PostHog project + GA4 property.
2. Configurar `POSTHOG_API_KEY`, `POSTHOG_HOST` (default
   `https://us.i.posthog.com`), `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` en
   Coolify.
3. `lib/analytics` detecta las claves y deja de devolver Fake.
4. Validar primeros eventos en los dashboards.

### Fase F — Stripe Checkout (tarjeta) — LO ÚLTIMO

**Riesgo:** alto. Movimiento de dinero real automatizado. PSDD obligatorio.

1. Provisionar cuenta Stripe (test + live keys).
2. **Segunda instancia Coolify (staging)** con dominio separado.
3. En staging, configurar `STRIPE_SECRET_KEY` (test mode) +
   `STRIPE_WEBHOOK_SECRET` (test mode). Reemplazar
   `lib/stripe/FakeStripe` con adaptador SDK real.
4. Configurar webhook endpoint en Stripe Dashboard test:
   `https://staging.../api/webhooks/stripe`.
   Eventos: `checkout.session.completed`, `payment_intent.payment_failed`,
   `charge.refunded`.
5. Pasar la **suite PSDD §16 contra staging con cards de prueba**:
   - Tarjeta exitosa → orden CONFIRMED + stock baja + asiento.
   - Tarjeta declinada → status FAILED, sin stock baja.
   - Refund desde admin → REFUND_PENDING → webhook → REFUNDED + contra-ingreso
     4100 / clearing 1200.
6. **Solo entonces**: live mode keys en prod. Repetir suite mínima en prod con
   un cargo real bajo de prueba (refundeado).
7. Activar `store.config.ts` `payments.stripe.enabled = true` — el storefront
   empieza a mostrar el botón "Pagar con tarjeta" en `/orders/<id>` (gate por
   `canPayWithCard = flag + status PENDING_PAYMENT`). El botón dispara la
   server action `startCardCheckoutAction` → `createCardCheckout` → redirect a
   Stripe Checkout hosted. success_url → `/orders/<id>/payment-pending` (PSDD:
   no confirma pago, solo "procesando").
8. Documentar el primer cargo live en el sistema + verificar el
   primer asiento contable real.

## Inerte vs activo — checklist rápido

| Capability | Inerte sin claves | Encendido cuando |
|---|---|---|
| Bus de eventos | ⚠ Requiere cron `process-domain-events`. Sin cron, los eventos quedan PENDING (no rompen). | Cron Coolify configurado. |
| Verificación B2B | ✅ Storefront funciona porque grandfather migration deja orgs VERIFIED. | R2 provisionado + admin sube certificados nuevos. |
| Contabilidad | ✅ Postea siempre cuando hay eventos. Sin eventos = 0 asientos. | Tan pronto como hay órdenes nuevas. |
| Wire/ACH | ✅ El email noop sin Resend (ya en Fase 0); UI admin existe. | `reconcileWire` ejecutado manualmente. |
| FedEx | ✅ FakeFedex; cotizaciones funcionan con números falsos. | FEDEX_API_KEY presente. |
| Email | ✅ noop sin RESEND_API_KEY (no enviado real). | RESEND_API_KEY ya en Fase 0. |
| Analytics | ✅ FakeAnalytics in-memory. | POSTHOG_API_KEY / GA4 presentes. |
| Webhooks salientes | ✅ Sin `WebhookEndpoint`s = 0 entregas. | Admin crea endpoints + cron activo. |
| Stripe Card | ✅ FakeStripe; UI puede mostrarse pero `/api/webhooks/stripe` no entiende firmas reales hasta que esté el adapter. | LO ÚLTIMO, tras staging test-mode pase. |

## Rollback global

Si una capa rompe la tienda:

1. Desactivar el flag en `store.config.ts` (commit + push) o vaciar la env var
   correspondiente en Coolify y reiniciar. Los Fakes/noops vuelven.
2. Para la verificación gate: si todos los buyers nuevos quedan bloqueados,
   ejecutar manualmente:
   ```sql
   UPDATE "Organization" SET "verificationStatus" = 'VERIFIED', "verifiedAt" = NOW()
   WHERE "verificationStatus" = 'PENDING';
   ```
   Y planear el retry de verificación cuando esté el flow funcional.
3. Las migraciones Prisma son aditivas — rollback no es necesario.

## Mantener actualizado

Cada vez que se enciende una capa: tachar el item en este runbook + agregar
fecha y observaciones en `docs/runbooks/payments.md` (live since X).
