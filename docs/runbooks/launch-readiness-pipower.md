# Launch readiness — pipower.shop (salida al público)

> Plan para destapar `MAINTENANCE_MODE` con un lanzamiento **chico, controlado y seguro**, lo más rápido posible. Decisión de alcance: **pago por wire/ACH** (Stripe/tarjetas después, con su gate de staging). Estado del código: completo (Fases 0-5 + onboarding + i18n + Fase 6 Corte 0). Lo que falta es **provisioning/ops + un endurecimiento de código chico**.

## Veredicto honesto

- **Funciona:** sí. 388 tests, TDD, flujos B2B reales de punta a punta.
- **Pagos:** diseño fuerte (PSDD, ledger append-only). Lanzar **wire/ACH only**; no encender Stripe sin pasar la suite PSDD en staging.
- **Caídas:** a escala de pocos clientes B2B no se cae por carga. Punto único de falla (1 VPS, 1 DB, sin redundancia). El riesgo #1 es **backups** — confirmar que están activos y probar un restore.
- Pentest / alta disponibilidad / Stripe / FedEx real / analytics → **post-launch**, no bloquean un lanzamiento chico.

## Lo que YA está (no hay que hacerlo)

Sentry (client/edge/server) + logger Pino + `/api/health`; rate-limit en search y AI chat; modo mantenimiento; runbooks de `backup-restore`, `deploy-rollback`, `vps-maintenance`; estrategia de backup documentada; los 4 adaptadores reales (R2/FedEx/Stripe/analytics) ya codeados e inertes sin claves.

---

## Track A — CÓDIGO (CC) · pequeño, en paralelo

> Detalle en `docs/plans/2026-06-07-launch-hardening-cc.md`. Es el único código pendiente.

- [ ] **A1. Rate-limit en el sign-in (magic link).** `signInAction` hoy no tiene throttle → cualquiera puede disparar emails. Reusar `lib/rate-limit`, límite por IP y por email. TDD, gate verde, PR.
- [ ] **A2. `STORE_ID` en `.env.example`** (+ comentario: obligatorio en prod, default pipower en dev). Trivial, mismo PR.

## Track B — OPS (Herney en Coolify / DNS) · ruta crítica real

- [ ] **B1. Resend confirmado en prod.** `RESEND_API_KEY` + `RESEND_FROM_EMAIL` seteados y verificados (dominio verificado en Resend). **El login depende de esto** — sin email no hay magic link, nadie entra.
- [ ] **B2. Backups de DB activos + restore probado.** ← riesgo #1.
  - En Coolify: habilitar backup diario de Postgres (retención 14 días) + **off-site** (Hetzner Storage Box o R2) en `Backups → Settings`.
  - Hacer **un restore de prueba** a una DB descartable y verificar `/api/health` + un par de queries (runbook `backup-restore.md`).
- [ ] **B3. Crons agendados en Coolify** (`ops/coolify-scheduled-tasks.md`):
  - `process-domain-events` — `* * * * *` (**crítico**: sin esto, orden no genera factura/email/asiento).
  - `process-search-index-queue` — `* * * * *`.
  - `cleanup-domain-events` — `0 3 * * 0`.
  - (`process-webhook-deliveries` solo si se usan webhooks → diferir.)
- [ ] **B4. Dominio + SSL.** Apuntar `pipower.shop` a Coolify, emitir certificado, y setear `NEXTAUTH_URL=https://pipower.shop` (+ `STORE_ID=pipower`, ya hecho).
- [ ] **B5. Almacenamiento R2** — **solo si** clientes nuevos se auto-onboardean y suben certificado fiscal en el launch. Provisionar bucket + `R2_*` (Fase A del go-live). Si vas a onboardear/verificar a mano a los primeros clientes → **diferir** sin bloquear.
- [ ] **B6. Pago wire/ACH listo.** Datos bancarios en el template `INVOICE_ISSUED` + tener claro el flujo de conciliación manual (`/admin/orders/<id>` → "Conciliar wire").
- [ ] **B7. (recomendado, no bloqueante) `app-rw-role` SQL** para el hardening append-only DB (`append-only-db-hardening.md`). El guard a nivel app ya cubre; esto es defensa en profundidad — se puede hacer justo post-launch.

## Track C — Go / No-Go (cuando A y B estén)

- [ ] **C1. Smoke end-to-end en prod** (con `MAINTENANCE_MODE` aún `on`, vía cuenta de prueba): registrar org → verificar → navegar con precios → colocar orden → `order.placed`+`invoice.issued` → **email recibido** → admin concilia wire → asiento en ledger → `pnpm tsx scripts/trial-balance.ts` balanceado.
- [ ] **C2. Verificaciones de salud:** `/api/health` OK · Sentry recibiendo eventos de prueba · backup más reciente presente · crons corriendo (revisar logs).
- [ ] **C3. Destapar:** `MAINTENANCE_MODE=off` + redeploy. Observar el primer tráfico real + Sentry las primeras horas.

---

## Ruta más rápida (resumen)

1. CC arranca **Track A** ya (paralelo, horas).
2. En paralelo vos hacés los bloqueantes de **Track B**: **B1 (Resend), B2 (backups), B3 (crons), B4 (dominio), B6 (wire)**. B5 solo si self-serve; B7 puede ir justo después.
3. Mergeás A; corrés **Track C** (smoke + salud).
4. **Flip** `MAINTENANCE_MODE=off`.

Bloqueantes reales: A1, B1, B2, B3, B4, B6, C1. Todo lo demás se enciende/endurece después sin frenar la salida.

## Post-launch (hardening, sin bloquear)

Stripe/tarjetas (con staging + suite PSDD §16) · FedEx API real · analytics PostHog/GA4 · webhooks salientes · contenido/chat IA (`ANTHROPIC_API_KEY`) · revisión de seguridad externa / pentest · redundancia (réplica DB / HA) · rate-limit en más endpoints · Uptime Kuma externo.

**Rate-limit del password reset → store compartido (multi-instancia).** El rate-limit de `requestPasswordResetAction` (keys por IP **y** por email, ya implementado — security review M-2) usa un store **in-memory por instancia** (`lib/rate-limit.ts`). En single-instance (estado actual) el límite es efectivo. Antes de escalar a multi-instancia, mover el store a Redis para que el límite sea global; si no, el techo efectivo se multiplica por la cantidad de instancias. No bloquea launch.
