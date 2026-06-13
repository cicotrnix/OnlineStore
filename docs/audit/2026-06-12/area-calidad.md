# Auditoría de área — Calidad de código y deuda técnica

**Semáforo:** 🟡 Amarillo

## Veredicto

La base de código es disciplinada para su velocidad: TDD real en todos los módulos críticos, cero console.log, cero TODOs, commits convencionales 50/50 y helpers de dinero centralizados. La deuda se concentra en la capa de server actions de app/: catches silenciosos sin logging en los flujos de carrito/checkout (ceguera operacional pre-launch), el helper de autorización requirePlatformAdmin duplicado 4 veces ya con drift, y un canal de warnings de lint 100% saturado por noNonNullAssertion que oculta futuros casos reales. Nada bloquea el launch por sí solo, pero CAL-1 y CAL-2 deberían resolverse antes.

## Fortalezas confirmadas

- **TDD cumplido en todos los módulos críticos de CLAUDE.md**
  - Evidencia: `find modules/<m> -name '*.test.ts': config 3, customers 3, pricing 2, cart 2, orders 2, checkout 1, payments 4, accounting 4, events 4, search 7, ai 11 archivos de test — más gate-test.txt con 438 passed + 6 skipped`
- **Cero console.log/error/warn en código de producción — disciplina Pino consistente**
  - Evidencia: `grep -rn 'console\.(log|error|warn)' app modules lib components (excluyendo tests) devolvió 0 resultados; logger Pino usado en módulos, ej. modules/accounting/posting.ts:100`
- **Formateo de dinero centralizado sin duplicación entre admin y storefront**
  - Evidencia: `grep formatMoney: 20+ call sites (app/page.tsx:233, app/admin/orders/[id]/page.tsx:73, app/(account)/orders/[id]/page.tsx:77, etc.) todos importan de @/lib/money; cero toFixed(2)/Intl.NumberFormat locales`
- **Conventional Commits 50/50 y cero TODO/FIXME/HACK en el código fuente**
  - Evidencia: `git log --oneline -50: todos los commits con prefijo feat/fix/docs/chore; grep -rn 'TODO|FIXME|HACK|XXX' app modules lib components solo matchea el falso positivo 'G-XXX' en lib/analytics/__tests__/selector.test.ts:51`
- **Errores de dominio tipados y validaciones duras en el ledger (camino del dinero)**
  - Evidencia: `modules/accounting/posting.ts:26-41 (UnbalancedEntryError, ClosedPeriodError), posting.ts:61-62 (débitos=créditos + zero-total guard), modules/orders/errors.ts:1-21 (InsufficientStockError, ProductInactiveError, EmptyCartError)`

## Hallazgos

### CAL-1 · [P1] Catches silenciosos sin logging en server actions de carrito y checkout — fallos de compra invisibles para ops  *(esfuerzo S)*

**Evidencia:** `app/(storefront)/_actions.ts:41, :55, :67, :104 y app/admin/_actions.ts:193 — bloques `catch {` que redirigen a un toast genérico; ninguno de los dos archivos importa logger (imports en líneas 1-13 de ambos)`

**Detalle:** placeOrderAction (app/(storefront)/_actions.ts:95-106) envuelve checkoutService.confirm en try/catch vacío: InsufficientStockError, ProductInactiveError, el sentinel 'ORG_NOT_VERIFIED' (modules/checkout/service.ts:79) y cualquier error de DB colapsan todos en 'checkout.toast.failed' sin registrar nada en Pino ni Sentry. En producción, una racha de checkouts fallidos (stock, verificación, bug de pricing) sería indistinguible de tráfico normal — el comprador ve un toast genérico y el operador no ve nada. Lo mismo aplica a addToCart/updateQuantity/removeItem y a la subida de certificados fiscales en admin (uploadTaxCertificateAction:193).

**Recomendación:** En cada catch: logger.error({ err, userId, orgId, action }) antes del redirect, y mapear los errores ya tipados de modules/orders/errors.ts + ORG_NOT_VERIFIED a message keys específicas (ej. checkout.toast.insufficientStock, checkout.toast.notVerified). Es ~6 actions, los tipos de error ya existen.

**Verificación adversarial:** ✅ CONFIRMADO — prioridad ajustada: **P1**
> Evidencia verificada literalmente: app/(storefront)/_actions.ts tiene `} catch {` desnudos en las líneas 41, 55, 67 y 104, todos redirigiendo a toast genérico, y no importa logger (imports líneas 1-13). app/admin/_actions.ts:193 igual en uploadTaxCertificateAction. El sentinel 'ORG_NOT_VERIFIED' existe en modules/checkout/service.ts:79. La interpretación es correcta y se agrava con tres hechos que el auditor no citó: (1) existe logger Pino en lib/observability/logger.ts usado en lib/fedex, lib/email y lib/analytics — la omisión es inconsistente con la práctica del repo y el fix es trivial; (2) ningún módulo subyacente (orders/cart/checkout/verification) loggea tampoco — el swallow es total en todas las capas; (3) instrumentation.ts no tiene onRequestError (Next 14.2.18 ni lo soporta), así que Sentry jamás ve estos errores, y el runbook de launch (launch-readiness-pipower.md C2/C3) basa el monitoreo post-launch precisamente en "observar Sentry las primeras horas" — estos catches lo dejan ciego en el path de revenue. Mitigaciones parciales que el auditor no vio y que matizan pero no refutan: /checkout llama requireVerifiedCustomer() que redirige orgs no verificadas antes de ver el form (el path ORG_NOT_VERIFIED es casi inalcanzable vía UI), y el review step deshabilita el botón con issues de stock/inactive (esos errores en confirm solo ocurren por carrera TOCTOU o POST directo). Además el comprador sí ve un toast — la invisibilidad es solo para ops. Aun así, bugs de pricing, errores de DB y carreras de stock colapsan sin señal alguna en el flujo que genera el dinero, en vísperas de launch y contradiciendo el plan de monitoreo documentado: P1 se sostiene.
>
> Evidencia extra: `lib/observability/logger.ts existe (Pino) y se usa en lib/fedex/index.ts:166,256, lib/email/resend.ts:34, lib/analytics/index.ts:65,84 — pero en cero archivos de modules/orders, modules/cart, modules/checkout, modules/verification. instrumentation.ts (raíz) solo registra sentry.server.config y approval-hook; sin onRequestError, y el proyecto usa next 14.2.18 + @sentry/nextjs ^10.53.1 (Next 14 no soporta captureRequestError), por lo que ni siquiera errores no capturados en server actions llegarían a Sentry — la única vía de visibilidad es logging explícito, que falta. docs/runbooks/launch-readiness-pipower.md líneas 44-45: el checklist de launch depende de "Sentry recibiendo eventos de prueba" y "Observar el primer tráfico real + Sentry las primeras horas". Mitigaciones upstream: app/(storefront)/checkout/page.tsx:17 requireVerifiedCustomer() (lib/auth/customer.ts:95-103 redirige pending/rejected a /onboarding) y page.tsx:35,200-207 deshabilita el submit con hasBlockingIssue (inactive/insufficient-stock detectados por checkoutService.review). Ningún test unit/e2e cubre las ramas catch (app/(storefront)/__tests__ solo tiene layout.test.tsx; ningún spec e2e referencia los toasts de fallo).`

### CAL-2 · [P2] requirePlatformAdmin (helper de autorización) duplicado 4 veces con drift ya presente; safeReturnTo 3x, adminToast 2x  *(esfuerzo S)*

**Evidencia:** `app/admin/_actions.ts:31, app/admin/_actions-fase2.ts:32, app/admin/products/_ai-actions.ts:11, app/admin/search/_actions.ts:8 (cuatro definiciones); safeReturnTo en app/admin/_actions.ts:15, app/admin/_actions-fase2.ts:16, app/(storefront)/_actions.ts:15; adminToast en _actions.ts:21 y _actions-fase2.ts:22`

**Detalle:** El check de seguridad más sensible del admin (gate isPlatformAdmin con query a DB) está copiado-pegado en 4 archivos y ya divergió ('Forbidden — platform admin only' vs 'Forbidden'). Si un fix de seguridad futuro (ej. chequear también verificationStatus o sesión de impersonation) se aplica en 3 de 4 copias, queda un agujero silencioso. safeReturnTo es defensa anti open-redirect — misma lógica de drift aplica.

**Recomendación:** Mover requirePlatformAdmin a lib/auth/helpers.ts (junto a requireAuth, que ya existe ahí) y safeReturnTo/adminToast a lib/feedback/action-result.ts. Borrar las copias. Cambio mecánico de <1 día con typecheck como red.

### CAL-3 · [P2] Los 71 warnings de lint son 100% noNonNullAssertion — todos los casos prod verificados son guarded (ruido), pero el canal saturado oculta futuros casos reales  *(esfuerzo S)*

**Evidencia:** `pnpm exec biome check . --max-diagnostics=200: 71/71 son lint/style/noNonNullAssertion; ~56 en tests/e2e, ~15 en prod. Verificados guarded: modules/accounting/posting.ts:92 (guard en :78-80), modules/accounting/reports.ts:44 (guard :35), app/(storefront)/_actions.ts:40,98 (redirect never en :35/:87), app/(onboarding)/onboarding/_actions.ts:116 (guard :96-98). gate-lint.txt:344-348: 'Diagnostics not shown: 51 ... EXIT=0'`

**Detalle:** Ninguno de los `!` en código de dinero es un riesgo activo hoy — posting.ts:92 y reports.ts:44 tienen guards explícitos dos líneas arriba; los orgId!/order! de storefront están narrowed por redirect():never. El problema es estructural: el gate pasa con EXIT=0, Biome trunca la salida a 20 diagnósticos, y CI no distingue 71 de 72 warnings. Un `!` genuinamente inseguro agregado mañana en handleStripeWebhook sería invisible en el ruido.

**Recomendación:** Dos pasos: (1) override de Biome permitiendo noNonNullAssertion solo en **/__tests__/** y tests/e2e/**; (2) refactorizar los ~15 casos prod a narrowing explícito (early return o variable local post-guard) y promover la regla a error. El repo queda en 0 warnings y cualquier warning nuevo es señal real.

### CAL-4 · [P2] handleStripeWebhook es una sola función de ~217 líneas que concentra todo el camino crítico del dinero  *(esfuerzo M)*

**Evidencia:** `modules/payments/service.ts:117 (inicio de handleStripeWebhook) hasta :333 (la siguiente función reconcileWire arranca en :334); el archivo completo tiene 420 líneas`

**Detalle:** Dedup por eventId, detección de mismatch, auto-refund, NEEDS_REVIEW, row-lock + decremento atómico de stock, emisión de payment.captured y posting al ledger viven en un único cuerpo de función. Está bien testeada (4 archivos de test en modules/payments) pero cualquier cambio futuro (nuevo método de pago, nuevo edge case de Stripe) obliga a razonar sobre 200+ líneas con estado transaccional. Es el lugar más caro del codebase para introducir un bug.

**Recomendación:** Extraer helpers privados por rama (handleMismatch, handleHappyPath, handleRefundEvent) dentro del mismo módulo, manteniendo la firma pública y los tests existentes como red de regresión. No cambiar semántica.

### CAL-5 · [P2] Modelo de errores inconsistente entre fases: clases tipadas (Fase 1/5) vs string-sentinels (Fase 5 verification) vs Error genérico  *(esfuerzo S)*

**Evidencia:** `modules/orders/errors.ts:1-21 (clases tipadas, Fase 1) vs modules/checkout/service.ts:79 y modules/cart/service.ts:20 (`throw new Error('ORG_NOT_VERIFIED')`, sentinel sin tipo) vs modules/orders/service.ts:154,180 (`throw new Error('Order not found')`)`

**Detalle:** Fase 1 estableció el patrón correcto (modules/orders/errors.ts), pero el gate de verificación de Fase 5 regresó a sentinels de string que solo se pueden distinguir con e.message === 'ORG_NOT_VERIFIED' — frágil ante refactors y razón directa por la que los catches de CAL-1 no discriminan. Duplicado además en dos módulos (cart y checkout lanzan el mismo sentinel por separado).

**Recomendación:** Crear OrgNotVerifiedError en modules/verification (o errors compartido del módulo) y usarlo en cart/checkout; adoptar la convención 'toda condición de negocio lanzas clase tipada exportada por el index.ts del módulo' antes de extraer la plantilla en Fase 6.

### CAL-8 · [P2] lib/i18n/messages.ts monolítico (1217 líneas, ~669 entradas) — hotspot de merge y bloqueador del modelo dominio-como-datos de Fase 6  *(esfuerzo M)*

**Evidencia:** `wc -l: lib/i18n/messages.ts = 1217 líneas (el archivo más grande del codebase, 3x el siguiente módulo); grep -c entradas de mensaje = 669; estructura union-type MessageKey + records por locale en un solo archivo`

**Detalle:** Cada cambio de UI en cualquier superficie (home redesign, catálogo, admin) toca este único archivo: es el merge-conflict hotspot natural del barrido i18n en curso y de los PRs por superficie del rediseño. Para Fase 6 multi-tenant, el copy es por-tienda (dominio-como-datos según ROADMAP) y un union type compilado de 669 keys en un archivo no escala a N tiendas con overrides. El patrón hand-rolled (ADR 0025) es válido; el empaquetado en un solo archivo no.

**Recomendación:** Partir por namespace (landing.ts, admin.ts, checkout.ts...) re-exportados desde messages.ts manteniendo el tipo MessageKey como unión derivada (keyof typeof). Hacerlo durante el barrido i18n ya planificado para no pagar dos veces.

### CAL-6 · [P3] Estructura con historia filtrada: _actions-fase2.ts nombrado por fase + dynamic imports redundantes de módulos ya importados estáticamente  *(esfuerzo S)*

**Evidencia:** `app/admin/_actions-fase2.ts (158 líneas, nombre por fase de desarrollo); app/admin/_actions.ts:6 importa toastUrl estáticamente y :132 y :146 lo re-importan con `await import('@/lib/feedback/action-result')` en el mismo archivo`

**Detalle:** El nombre del archivo refleja cuándo se escribió, no qué hace (quotes/credit/tiers/catalog-access). Los dynamic imports de toastUrl en approveOrganizationAction/rejectOrganizationAction son redundantes con el import estático de la línea 6 del mismo archivo — ruido que sugiere copy-paste entre iteraciones. Para la Fase 6 (extracción a plantilla) esta organización por-fase complica saber qué es dominio y qué es plataforma.

**Recomendación:** Renombrar/partir _actions-fase2.ts por dominio (quotes-actions.ts, credit-actions.ts) cuando se toque ese código; eliminar los dos await import redundantes ya (2 líneas).

### CAL-7 · [P3] Imports relativos profundos que violan la convención @/* y componente compartido viviendo dentro de un route segment  *(esfuerzo S)*

**Evidencia:** `app/(account)/account/SetPasswordForm.tsx:9 y app/(account)/account/ChangePasswordForm.tsx:9: `import { PasswordStrengthMeter } from '../../(auth)/sign-up/PasswordStrengthMeter'` — únicos 2 hits de `from '../..` en todo app/modules/lib/components`

**Detalle:** CLAUDE.md exige alias @/* para imports. PasswordStrengthMeter es un componente reutilizado por 3 superficies (sign-up, set-password, change-password) pero vive dentro del route segment de sign-up, forzando imports relativos que cruzan route groups — exactamente el acoplamiento que la convención de módulos cerrados quiere evitar.

**Recomendación:** Mover PasswordStrengthMeter a components/auth/ (o components/ui/) e importar vía @/components/...; son 3 imports a actualizar.

### CAL-9 · [P3] Páginas server-component monolíticas de 300-370 líneas que mezclan query, forms y markup  *(esfuerzo M)*

**Evidencia:** `wc -l: app/page.tsx 372, app/admin/products/page.tsx 344, app/admin/customers/[id]/page.tsx 297, app/(storefront)/checkout/page.tsx 219 — los 4 page components más grandes; app/page.tsx es un único LandingPage() con 61 className`

**Detalle:** No es bloqueante (son RSC sin estado), pero admin/products/page.tsx mezcla en un archivo el listado, el form de creación, el toggle de privacidad y la gestión de tiers — superficie que el rediseño UI va a tocar pronto. La home ya extrajo componentes compartidos (StatStrip, SpecReadout, Header) demostrando el patrón correcto; las páginas admin no lo siguieron.

**Recomendación:** No refactor preventivo: aplicar la regla 'al tocar una superficie en el rediseño, extraer secciones >50 líneas a componentes'. Ya está planificado superficie-por-superficie, solo añadir el criterio al checklist de cada PR de rediseño.

## Tensiones estratégicas (decide el owner)

- Doble convención de feedback sancionada (redirect+toastUrl para acciones que navegan vs ActionResult+useFormState para inline, lib/feedback/action-result.ts:1-17): hoy solo los 4 forms de auth (junio) usan ActionResult y todas las actions Fase 1-5 usan toastUrl. ¿Converger a un solo patrón antes de extraer la plantilla Fase 6, o congelar la dualidad como contrato documentado? Converger después de Fase 6 costará N tiendas más caro.
- Política de warnings en CI: el gate de lint pasa con EXIT=0 y 71 warnings, y Biome trunca la salida a 20 diagnósticos. ¿Deben los warnings bloquear el merge (cero-warnings policy) o se acepta el canal degradado? Decisión de proceso, no de código — pero condiciona el valor de CAL-3.
- i18n hand-rolled (ADR 0025) vs librería: el monolito de 669 keys funciona para 1 tienda / 2 locales, pero Fase 6 promete copy por-tienda como datos. ¿Se invierte en partir/parametrizar el sistema propio (CAL-8) o se migra a una librería con namespaces y overrides antes de multiplicar tiendas? Cada tienda nueva lanzada con el modelo actual aumenta el costo de la migración.
- Refactor de _actions-fase2.ts y páginas admin gigantes: hacerlo ahora (pre-launch, sin tráfico, barato) compite por tiempo con el rediseño UI en curso. El riesgo de posponerlo es bajo en producción pero el costo crece cuando el rediseño toque esas superficies con la estructura vieja.
