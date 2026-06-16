# Spec — Auth (sign-in / sign-up / reset) · rediseño "Back to 100%"

**Fecha:** 2026-06-15
**Origen:** Sexta superficie del rediseño, tras Home · Header · Catálogo · PDP · Carrito+Checkout. Las pantallas de `(auth)` siguen con los primitivos viejos (`bg-gray-50`, card blanco genérico, inputs sin estilizar, sin `<label>`). Nada de "Back to 100%".
**Negocio:** B2B mayorista Pi-Power. Login y registro son la puerta de entrada — el momento donde más pesa la identidad de marca y donde el comprador que re-ordena vuelve cada semana. Velocidad-a-cuenta manda; el form no se frena por decoración.

## Objetivo

Restilar todas las superficies de `(auth)` al sistema "Back to 100%" con un **shell de dos columnas** (panel de marca oscuro + columna de formulario limpia), y **agregar un flujo real de reset de contraseña** (hoy inexistente). Preservar toda la lógica de auth existente; lo único net-new es el reset (modelo de token + dos pantallas + dos actions + email).

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Layout = B (panel de marca dividido).** Panel oscuro `neutral-900` a la izquierda (logo + gauge estático 100% + chips `0 cycles` / `+10% capacity`), columna de formulario sobre superficie blanca a la derecha. En mobile el panel colapsa a una barra superior compacta (logo + tagline una línea) y el form ocupa el ancho.
2. **Recuperación = reset real ahora.** Se construye el flujo completo: `/forgot-password` (pedir) + email con link + `/reset-password/[token]` (fijar nueva). Esto **desambigua el sign-in**: queda "Forgot password?" → reset real, y por separado "Email me a sign-in link" → magic link (passwordless). Dos cosas distintas, claras.
3. **Alcance = todas las superficies de `(auth)`.** `/sign-in`, `/sign-up`, `/invite/[token]` (hoy en inglés hardcodeado, sin i18n, sin estilizar → se migra), el layout compartido, los estados intermedios (check-inbox / link enviado), más las dos pantallas net-new de reset.
4. **Panel de marca = estático, server-rendered.** Gauge SVG fijo en 100%, **sin GSAP** — auth se mantiene liviana (no se infla el bundle con motion ni Vaul). Fallback visual ya es el estado final; nada que animar.
5. **Tras reset exitoso = auto-sign-in.** Se revoca toda sesión previa del usuario, se mintea una sesión fresca y se redirige a `/select-org` (mismo destino que password sign-in). TTL del token de reset = **1h**, single-use.

## Arquitectura

### `AuthShell` + `AuthBrandPanel` (nuevos — el shell de dos columnas)

`(auth)/layout.tsx` deja de ser un card centrado y pasa a ser el shell de dos columnas. `AuthBrandPanel` (server, estático) renderiza: logo Pi·Power, un gauge SVG fijo en 100%, headline "Back to 100%", y chips mono (`0 cycles`; `+10% capacity` **solo** como claim del fabricante — nunca inventado, gated por dato real). La columna derecha es el slot (`children`): cada page renderiza su form o su estado ahí. `LocaleSwitch` se reubica en el chrome del shell. En mobile: `AuthBrandPanel` colapsa a barra superior compacta.

Tokens: panel `neutral-900 #1a1f2e`; columna de form `surface #ffffff`; CTA lima `#88d810` con texto `ink-950` (regla de marca: lima como caja con texto oscuro, no botón blanco); links lima sobre dark / `lime-deep #5fa000` sobre blanco (AA); `rounded-button 9px`, `rounded-card 14px`; mono (`--font-mono`) para chips/labels técnicos.

### `AuthField` (nuevo — primitivo de campo)

Hoy cada input es un `<input className="w-full border rounded-lg …">` repetido y **sin `<label>`** (placeholder-only, falla WCAG). `AuthField` encapsula label real (visible o sr-only) + input estilizado + slot de error con `aria-describedby`/`aria-invalid`. DRY para los cinco forms. No es un rediseño de design-system global — es el primitivo de la superficie auth.

### Reset de contraseña (net-new — única lógica nueva)

**Modelo `PasswordResetToken`** (espeja el patrón ya probado de `SensitiveActionToken`): `id`, `userId`, `tokenHash @unique`, `expiresAt`, `usedAt DateTime?`, `createdAt`, `@@index([userId])`. El token **crudo** viaja solo en el email; en DB se guarda el **hash SHA-256** (nunca el crudo). Migración Prisma nueva.

**`/forgot-password`** → `requestPasswordResetAction(email)`:
- Rate-limited con `PASSWORD_RESET_LIMITS` (nuevo preset; arranca con los valores de `SIGNIN_LIMITS` = 3/min, 10/h, ajustable).
- **Respuesta neutra siempre** ("si existe una cuenta con ese email, enviamos un link de reset") → no filtra qué emails existen (anti-enumeración).
- Si el user existe: invalida tokens de reset previos no usados del user, crea uno nuevo (TTL 1h), envía email react-email sobre `BaseTemplate` con link `/reset-password/<rawToken>`.
- Sin `RESEND_API_KEY` el envío es noop (no rompe) — mismo patrón que el resto.

**`/reset-password/[token]`** (page, server): hashea el token de la URL y busca por `tokenHash`. Estados:
- inválido / expirado / `usedAt` no null → mensaje claro + link a `/forgot-password` para pedir otro.
- válido → `ResetPasswordForm` (nueva contraseña + confirm + `PasswordStrengthMeter` reusado).

**`resetPasswordAction`**:
- Valida `validatePasswordPolicy` **antes** de consumir el token (clave débil no quema el token — patrón ya usado en `setPasswordAction`).
- En transacción: re-verifica token válido+no usado+no expirado (lock), set `hashedPassword` + `passwordUpdatedAt`, marca `usedAt = now`, setea `emailVerified` si era null (poseer el link prueba el email).
- **Revoca todas las sesiones del usuario** (reusa `invalidateOtherSessions` / `session.deleteMany`), luego `createDbSession` (sesión fresca) → redirect `/select-org`.

### Restyle (misma lógica)

`SignInForm`, `SignUpForm`, `invite/[token]/page.tsx`, estados check-inbox → solo presentación: shell nuevo, `AuthField`, CTA lima, copy i18n. Las server actions (`passwordSignInAction`, `signInAction` magic link, `signUpAction`, `acceptInvitationAction`), rate limits, `createDbSession`, redirects y gating **no se tocan**.

## Preservado (no se toca la lógica)

Password sign-in (`passwordSignInAction` + anti-timing `DUMMY_HASH`) · magic link (`signInAction` Resend) · sign-up (`signUpAction` + emailVerified flow) · accept invite (`acceptInvitationAction` + estados not-found/accepted/expired) · `createDbSession` (contrato Auth.js v5) · `validatePasswordPolicy` · `PasswordStrengthMeter` · `invalidateOtherSessions` · rate-limit · redirects a `/select-org` · cuenta ya tiene `ChangePasswordForm`/`changePasswordAction`/`setPasswordAction` (el "cambiar clave en settings" ya existe, no se toca).

## A11y (WCAG 2.1 AA)

- **`<label>` reales** en todos los campos (cierra el gap de placeholder-only actual). Errores con `role`/`aria-invalid`/`aria-describedby`.
- `AuthBrandPanel` decorativo → `aria-hidden`; el gauge SVG con `role="img"` + `<title>`.
- Contraste: lima `#88d810` sobre `neutral-900` y texto `ink-950` sobre lima verificados AA; links `lime-deep` sobre blanco.
- Focus visible en inputs/CTAs; orden de tabulación lógico (form primero, links después). Touch targets ≥44px en mobile.
- Sin motion (panel estático) → nada que gobernar con `prefers-reduced-motion`; si se agregara fill animado al gauge, respeta reduced-motion y SSR=100%.

## Testing

**Unit:** validez de `PasswordResetToken` (válido / expirado / `usedAt` / hash inexistente); `requestPasswordResetAction` devuelve respuesta neutra exista o no el user (anti-enumeración); `resetPasswordAction` valida policy antes de consumir token; reset revoca sesiones + mintea nueva; estados del shell por page; `AuthField` renderiza label+error+aria.
**e2e (prod build, regla TST-6):**
- Sign-in (password) → `/select-org`. Magic-link → estado check-inbox.
- Sign-up → estado "revisa tu email" + resend.
- **Reset happy path:** `/forgot-password` → (token de test) → `/reset-password/[token]` → nueva clave → auto-sign-in `/select-org`; token reusado → estado "usado".
- Accept invite → membership creada.
- axe por pantalla nueva.
**Gate ejecutable:** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` explícito (sin él ~239 rojos de entorno, no regresión) + `test:e2e:prod`.

## Seguridad (feature de credenciales)

Token: aleatorio ≥32 bytes, **hash SHA-256 en reposo**, single-use (`usedAt`), TTL 1h, request rate-limited, anti-enumeración (respuesta neutra), links HTTPS. Reset revoca **todas** las sesiones del user (no solo las "otras"). Invalida tokens de reset previos al pedir/usar uno. Correr el skill `security-review` antes de merge. **Smoke en prod innegociable** (lección registrada: typecheck/build ≠ runtime).

## Alcance

**Dentro:** `AuthShell` + `AuthBrandPanel` (dos columnas, mobile-collapse); `AuthField`; restyle de sign-in/sign-up/invite + estados; flujo de reset completo (`PasswordResetToken` + `/forgot-password` + `/reset-password/[token]` + 2 actions + email + preset rate-limit); i18n nuevo + invite migrado (`en-US` + `es-419`); a11y AA; tests unit + e2e prod + axe.

**Fuera (FU / superficies siguientes):**
- Rediseño de **Cuenta / Admin** (siguiente superficie del orden).
- Cambios al backend del magic link / Auth.js config.
- 2FA / step-up para sign-in (existe `SensitiveActionToken` para acciones sensibles autenticadas; fuera de alcance aquí).
- CRUD de gestión de miembros/invites desde admin (solo se restila el accept del invitado).

## Riesgos / notas

- **Migración Prisma nueva** (`PasswordResetToken`) → requiere `prisma migrate` en deploy. Coordinar con Coolify.
- **Toca credenciales:** el reset es el único camino con lógica nueva → TDD estricto, `security-review`, smoke prod. El restyle no roza las actions existentes; cualquier cambio que las roce va con su test.
- **Auth liviana:** no meter GSAP ni Vaul en el bundle de auth. Panel de marca estático.
- **Cross-surface (header):** las pantallas de auth no usan el `Header` unificado (shell propio) → no hay regresión de header, pero re-verificar que el `LocaleSwitch` sigue funcionando en el shell nuevo.
- **i18n:** barrido de claves `auth.*` nuevas + migración del invite; alinear con el FU transversal de i18n storefront pendiente.

## Reglas de ejecución

- Branch `redesign/auth`. PR. Review de Herney en localhost antes de merge. **No mergear sin confirmación.**
- Nunca dato inventado (capacidad solo si existe; claims solo del fabricante). TDD en el reset (token, actions, anti-enumeración). Conventional Commits, un commit por pieza (shell → AuthField → restyle sign-in/up → invite → modelo+migración reset → forgot/reset pages+actions → email → i18n → tests).
- `impeccable detect` / gate completo en verde antes de merge.
