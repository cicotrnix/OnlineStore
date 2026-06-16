# Spec — Cuenta (hub del comprador) · rediseño "Back to 100%"

**Fecha:** 2026-06-16
**Origen:** Séptima superficie del rediseño, tras Home · Header · Catálogo · PDP · Carrito+Checkout · Auth. Las superficies de `(account)` siguen con primitivos viejos (`Card`/`Button` gris, `bg-gray-50`). Ya viven **bajo el header interno unificado** (`HeaderContainer variant="inner"`), así que solo falta restilar el contenido + completar la cuenta.
**Negocio:** B2B mayorista Pi-Power. Es el área de trabajo del comprador autenticado: ver órdenes, re-ordenar (loop semanal), gestionar su perfil/direcciones/seguridad. No es un momento de marca como auth — es área de trabajo → mismo aesthetic que las páginas internas ya rediseñadas (catálogo/PDP/carrito).

**Decomposición:** "Cuenta/Admin" se separó en dos specs. **Este spec = Cuenta** (cara-al-comprador). **Admin** (operador de plataforma, ~16 pantallas, shell de sidebar propio, interno) va como spec aparte con tratamiento full Back-to-100% — decisión de Herney 2026-06-16.

## Objetivo

Restilar las superficies de `(account)` al sistema "Back to 100%" y convertir `/account` (hoy casi vacío: un solo card de password) en un **hub de cuenta completo** con sub-navegación. Cerrar de paso el **hueco de i18n** en órdenes (hoy con español hardcodeado). Restyle preserva toda la lógica; lo net-new es acotado (editar perfil + CRUD de direcciones) y sin modelo Prisma nuevo.

## Decisiones de diseño (cerradas con Herney en Cowork)

1. **Alcance = B (hub con sub-navegación).** Sobre A (página única rica) y C (hub + consolidar superficies de storefront). C se descarta por riesgo de re-rutear superficies que ya funcionan — se **enlazan**, no se mueven.
2. **4 secciones:** Overview · Profile · Addresses · Security. **Members (gestión de equipo) = follow-up**, spec posterior (la infra `inviteMember` ya existe parcialmente, pero suma superficie net-new).
3. **Aesthetic = página interna** (claro, bajo el header inner ya existente), NO el panel oscuro dividido de auth. Tokens Back-to-100%: slate `#1a1f2e`, lima `#88d810` (CTA con texto oscuro), `lime-deep #4d8000` (texto lima AA sobre blanco), `line #e5e7eb`, mono para números de orden/SKU/montos/terms. Instrument-grade en los datos (líneas/totales como readout).
4. **Órdenes:** restyle + **cierre de i18n** (todo el español hardcodeado → claves EN/ES) en `/orders`, `/orders/[id]`, `/orders/[id]/payment-pending`. El **Re-order** pasa a CTA lima prominente (es el loop semanal del comprador).
5. **Sin modelo Prisma nuevo.** Todos los campos ya existen (`User.name/preferredLocale`, `OrganizationAddress.*`). Net-new = actions + métodos de servicio, no schema → sin migración, menos riesgo que auth.

## Arquitectura

### `AccountShell` + sub-nav (nuevo)

Shell de dos zonas dentro del área `(account)`: sub-navegación lateral (Overview · Profile · Addresses · Security) + slot de contenido, bajo el header interno ya existente (no se toca el header). Activo con `aria-current="page"` en lima. Mobile: la sub-nav colapsa a tabs horizontales scrollables. Rutas:
- `/account` — Overview
- `/account/profile` — Profile
- `/account/addresses` — Addresses
- `/account/security` — Security
- `/orders` (+ `/orders/[id]`, `payment-pending`) — se mantiene fuera del shell de cuenta (es su propio flujo), enlazado desde Overview y desde "Buy again" del header.

### Overview (`/account`)

Read-only, rutea a las sub-páginas para editar. Bloques:
- **Identidad:** nombre, email (read-only), locale. Link "Edit" → `/account/profile`.
- **Organización:** nombre, badge de rol (`OWNER`/`ADMIN`/`BUYER`), estado de verificación + tax-exempt, payment terms + credit (mono), todo read-only. Link "Switch" → `/select-org`.
- **Accesos rápidos:** Órdenes / Facturas / Cotizaciones — gateados por feature flag (`credit`/`rfq`), solo se muestran los activos.

### Profile (`/account/profile`)

Editar `name` + `preferredLocale` (persistido). Email read-only (cambiar email es identidad de auth → fuera de alcance). Net-new: `updateProfileAction` (valida nombre, locale en el set permitido). Inputs con `AuthField` reusado de auth.

### Addresses (`/account/addresses`)

Lista de direcciones de la org como cards (label, recipient, líneas, badges `DEFAULT BILLING`/`DEFAULT SHIPPING`) + Add / Edit / Delete + set-default. **Gateado: `OWNER`/`ADMIN` editan; `BUYER` ve read-only** (las direcciones son de la organización, no del usuario). Net-new sobre lo existente:
- Ya existen: `customersService.createAddress` / `listAddresses` / `findAddressById` + `createAddressSchema`.
- **Net-new (TDD):** `updateAddress`, `deleteAddress`, `setDefaultBilling`/`setDefaultShipping` (servicio + repositorio + `updateAddressSchema`), con **unicidad de default** (al marcar uno, se desmarca el anterior — en transacción). Validación de país (2 letras, como onboarding). Delete con confirmación + manejo de foco; bloquear/avisar si la dirección está en uso por órdenes (FK `OrderBilling`/`OrderShipping` con `onDelete` — verificar comportamiento, preferir soft-guard sobre romper FK).

### Security (`/account/security`)

Se **mudan** acá los forms existentes `ChangePasswordForm` / `SetPasswordForm` (lógica intacta: `changePasswordAction`, `setPasswordAction` con step-up OTP), restilados con `AuthField`. Se agrega **"Sign out everywhere"** (revoca otras sesiones — reusa `invalidateOtherSessions(userId, currentToken)`, ya existe). `/account` deja de hostear el card de password (se va a esta sección).

### Órdenes — restyle + i18n (misma lógica)

- `/orders`: lista como filas instrument (número de orden mono, fecha, conteo de líneas, total tabular, `OrderStatusBadge` restilado, **Re-order lima prominente**). Empty state i18n.
- `/orders/[id]`: detalle instrument-grade — tabla de líneas como readout (SKU mono, nombre, precio, cant., total), direcciones billing/shipping, totales (subtotal/total), `OrderStatusBadge`+`PaymentBadge` restilados, "Pagar con tarjeta" (Stripe Checkout) restilado. Lógica de `ordersService.findById`, `payment`, `startCardCheckoutAction`, `ReorderButton` intacta.
- `/orders/[id]/payment-pending`: estados "procesando/confirmado" restilados (PSDD: no confirma pago acá — el webhook firmado es la verdad; sin cambios de lógica).
- **i18n:** todo el español hardcodeado (`Tus órdenes`, `Orden`, `Líneas`, `SKU/Producto/Precio/Cant./Total`, `Direcciones`, `Facturación/Envío`, `Subtotal/Total`, `Pagar con tarjeta`, los textos de payment-pending) → claves `account.orders.*` con paridad EN/ES.

### Select-org (`/select-org`)

Restyle menor del selector de organización (cards de org → tokens de marca). Lógica intacta (redirect si 0 o 1 org, `switchActiveOrg`).

## Componentes y reuso

Net-new: `AccountShell` (sub-nav), `AddressCard` + `AddressForm`, `updateProfileAction`, métodos de address CRUD en `modules/customers`. Reuso: `AuthField` (de auth), `PasswordStrengthMeter`, `ChangePasswordForm`/`SetPasswordForm` (restilados), `OrderStatusBadge`/`PaymentBadge` (restilados a tokens de estado de marca), `ReorderButton` (a lima), helpers de `product-display` y `lib/money` (`formatMoney`) en las líneas de orden.

## Preservado (no se toca la lógica)

`changePasswordAction`/`setPasswordAction` (step-up OTP) · `invalidateOtherSessions` · `ordersService` (list/findById) · `ReorderButton` + `reorderAction` (loop de re-orden) · `startCardCheckoutAction` (Stripe) · PSDD del payment-pending · `switchActiveOrg` + redirects de select-org · `requireVerifiedCustomer`/`requireActiveOrgId` gating · `customersService.createAddress`/`listAddresses` · feature flags.

## A11y (WCAG 2.1 AA)

Sub-nav con `aria-current="page"` + navegable por teclado. Forms con `<label>` reales (vía `AuthField`). Delete de dirección con confirmación accesible (dialog o two-step) + retorno de foco. Acciones gateadas por rol **comunicadas** (no solo ocultas — `BUYER` ve el estado read-only explicado). Tablas de órdenes con headers correctos. Contraste lima `#4d8000` en texto. Touch targets ≥44px en mobile. Cero motion nuevo pesado.

## Testing

**Unit:** address CRUD (`updateAddress`/`deleteAddress`/`setDefault*` incl. unicidad de default + guard de dirección en uso); gating por rol (OWNER/ADMIN vs BUYER) en address actions; `updateProfileAction` (valida nombre + locale permitido); sign-out-everywhere revoca otras sesiones.
**e2e (prod build, regla TST-6):**
- Overview renderiza identidad + org B2B + accesos rápidos gateados por flag.
- Profile: editar nombre/locale persiste.
- Addresses: add → edit → set-default → delete (happy path); BUYER ve read-only (sin botones de edición).
- Órdenes: lista + detalle renderizan en EN y ES (cierre de i18n), re-order agrega al carrito.
- axe por pantalla nueva.
**Gate ejecutable:** `pnpm format && lint && typecheck && test && build` con `STORE_ID=pipower` + `DATABASE_URL` explícito (sin él ~239 rojos de entorno, no regresión) + `test:e2e:prod`. Nota DX: correr vitest dispara `cleanDb` y borra la DB dev → reseed después.

## Alcance

**Dentro:** `AccountShell` + sub-nav; Overview; Profile (editar nombre/locale, net-new); Addresses (CRUD net-new, gateado por rol); Security (mudanza + restyle de password forms + sign-out-everywhere); restyle + i18n de órdenes (lista/detalle/payment-pending); restyle de select-org; a11y AA; tests unit + e2e + axe.

**Fuera (FU / specs siguientes):**
- **Members** (gestión de equipo: lista + invitar + rol/remover) → follow-up.
- **Admin** (operador de plataforma) → spec aparte, full Back-to-100%.
- Cambio de email (identidad de auth).
- Mover Facturas/Cotizaciones/Notificaciones/Aprobaciones al área de cuenta (era la opción C, descartada).

## Riesgos / notas

- **Sin migración Prisma** (todos los campos existen) → menor riesgo que auth. El net-new es solo lógica de app (actions + métodos de servicio) → TDD.
- **i18n de órdenes es amplio** (muchos strings hardcodeados) → cuidar paridad EN/ES y no dejar claves sueltas; alinear con el barrido i18n storefront pendiente (`docs/plans/2026-06-10-i18n-storefront-sweep.md`).
- **Direcciones son org-level:** gating por rol con cuidado (no exponer edición a BUYER); el delete debe respetar FKs de órdenes (`OrderBilling`/`OrderShipping`) — soft-guard antes que romper integridad.
- **Cross-surface (header):** el área de cuenta ya usa el header inner; agregar la sub-nav no debe duplicar el menú "My account" del header — la sub-nav es navegación intra-cuenta, el menú del header es entrada/salida. Re-verificar que no se pisen.

## Reglas de ejecución

- Branch `redesign/account`. PR. Review de Herney en localhost antes de merge. **No mergear sin confirmación.**
- Nunca dato inventado (estado B2B, montos, terms → solo datos reales de DB). TDD en lo net-new (address CRUD, profile, gating). Conventional Commits, un commit por pieza (shell+sub-nav → overview → profile → addresses CRUD → security → orders restyle+i18n → select-org → tests).
- `impeccable detect` / gate completo en verde antes de merge.
