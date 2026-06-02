# Onboarding B2B + gating de precio/compra

> Spec de diseño. Brainstorming en Cowork (2026-06-02).
> Estado: **diseño aprobado, pendiente de plan de implementación**.
> Contexto: Fase 5 dejó verificación + storage (R2) listos, pero solo el admin podía crear org y subir certificado. Falta la **puerta de entrada de clientes reales**.

## 1. Objetivo

Permitir que un negocio se **auto-registre**, cargue sus datos + certificado de reventa, quede **PENDING**, y un admin lo **apruebe** manualmente para habilitarlo a ver precios y comprar. Conservar SEO y descubrimiento manteniendo el catálogo público; gatear solo **precio y compra**.

## 2. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Registro | **Auto-registro + aprobación manual del admin.** El negocio se registra y sube cert → queda PENDING → admin aprueba/rechaza. |
| Público (indexable) | Landing, listado de catálogo, categorías, búsqueda y **PDPs** (specs + contenido IA), **sin precio** y sin botón de compra. |
| Gated (login + VERIFIED) | **Precio**, agregar al carrito, checkout, cuenta, órdenes, facturas, quotes, re-orden. |
| Gating | Patrón "para ver precio o comprar, login + verificado". Catálogo/PDP públicos; gate en la capa de precio/compra + rutas de cuenta/checkout (guard RSC). |
| Onboarding | Form de una sola página (datos org + subida cert) → una server action → PENDING. |
| Aprobación | Extiende `/admin/customers` (estado + Aprobar/Rechazar en el detalle, junto al visor de certificado). |
| SEO | Landing + catálogo + PDPs públicos conservan el SEO y el contenido de Fase 4. Solo el precio queda oculto al anónimo. |

Esto **revisa** la decisión previa de "auto-aprobación al subir cert" (ahora es aprobación manual) y la de "todo gated" (ahora catálogo/PDP públicos sin precio).

## 3. Rutas: público vs gated

**Público (sin auth):**
- `/` — **landing de marketing** (reemplaza la home-storefront actual). SEO metadata, hero PiPower, CTAs "Registrá tu negocio" + "Iniciar sesión". Sin catálogo ni precios.
- `/catalog`, `/catalog/[category]`, `/search`, `/products/[slug]` — listado + búsqueda + PDPs. Renderizan specs y contenido; **sin precio**: muestran CTA "Iniciá sesión / registrá tu negocio para ver precios mayoristas", sin "agregar al carrito".

**Gated (login + org VERIFIED) — guard RSC `requireVerifiedCustomer()`:**
- Carrito, checkout, órdenes, facturas, quotes, approvals, notifications, cuenta.

**Mecánica de gating (estado → destino):**
- No logueado y pide algo gated → `/sign-in`.
- Logueado **sin organización** → `/onboarding`.
- Org **PENDING** → `/onboarding/pending` ("en revisión").
- Org **REJECTED** → `/onboarding/pending` con el motivo + opción de re-subir.
- Org **VERIFIED** → acceso completo.

Reorganización de route groups: separar el catálogo público de las rutas de comercio gated. Catálogo/búsqueda/PDP a un grupo **público** (sin guard); carrito/checkout/quotes/facturas/approvals/notifications a un grupo **gated** (layout con `requireVerifiedCustomer()`). `(account)` ya es gated.

## 4. Precio y compra (la capa que se gatea)

- **PDP / cards:** si no hay org VERIFIED en sesión, no se resuelve pricing; se muestra el CTA "registrate para ver precios" en lugar del precio, y se oculta "agregar al carrito".
- **Resolución de precio:** sigue usando `modules/pricing` (precio por cliente de Fase 1/2) solo cuando hay org verificada.
- **Server action de agregar al carrito y checkout:** exigen usuario logueado + org VERIFIED (defensa en profundidad, no solo ocultar el botón).

## 5. Onboarding (`app/(onboarding)/`)

- `/onboarding` — form de una sola página, visible para usuario logueado **sin org**:
  - Datos de la organización: razón social, país, dirección (line1, city, postalCode, etc.).
  - Certificado: tipo (`US_RESALE_CERT` | `FOREIGN_EQUIV`), número, jurisdicción, archivo (PDF/imagen, ≤10 MB).
  - Una **server action** `submitOnboarding`: crea `Organization` (PENDING) + `OrganizationMember` (OWNER) para el user + sube el archivo a R2 + crea `TaxDocument`; setea `verificationSubmittedAt`. Redirige a `/onboarding/pending`.
- `/onboarding/pending` — pantalla "tu cuenta está en revisión"; si REJECTED, muestra el motivo + permite re-subir el certificado (vuelve a PENDING).
- Si el user ya pertenece a una org, no ve onboarding (lo maneja el guard).

## 6. Aprobación admin (extiende `/admin/customers`)

- Lista de clientes: agregar columna/booleano de `verificationStatus`, con un filtro/orden para ver los **PENDING** primero.
- Detalle del cliente (donde ya está el visor de certificado con URL firmada): botones **Aprobar** y **Rechazar** (con campo motivo), gated por `requirePlatformAdmin`.
  - **Aprobar** → `verificationStatus = VERIFIED`, `taxExempt = true`, emite `customer.verified`.
  - **Rechazar** → `verificationStatus = REJECTED`, guarda `rejectionReason`, emite `customer.rejected`.

## 7. Backend

- `modules/verification`:
  - `uploadCertificate(input)` — sube a R2 + crea `TaxDocument` + deja la org **PENDING** (sin auto-aprobar). `verificationSubmittedAt = now`.
  - `approveOrganization(orgId, byAdminId)` — PENDING→VERIFIED + taxExempt + emite `customer.verified`.
  - `rejectOrganization(orgId, byAdminId, reason)` — →REJECTED + `rejectionReason` + emite `customer.rejected`.
  - Se mantiene `uploadAndAutoApprove` para la subida admin-directa (compone `uploadCertificate` + `approveOrganization`).
- `modules/customers`:
  - `createOrganizationWithOwner(userId, { name, country, address })` — crea org PENDING + member OWNER en una transacción.
- Contrato de eventos: **agregar `customer.rejected`** a `EVENT_TYPES` (aditivo; `customer.verified` ya existe).
- Email subscriber + 2 plantillas react-email: **aprobado** ("ya podés ver precios y comprar") y **rechazado** (con motivo). Disparadas por los eventos vía el bus.

## 8. Datos (deltas Prisma)

- `Organization.rejectionReason String?`
- `Organization.verificationSubmittedAt DateTime?`

Todo lo demás reusa lo existente (`verificationStatus`, `taxExempt`, `TaxDocument`, `OrganizationMember` con rol OWNER).

## 9. Testing

- **Gating:** rutas de comercio gated redirigen según estado (sin login / sin org / PENDING / REJECTED / VERIFIED). PDP público renderiza sin precio para anónimo y con precio para verificado.
- **Compra:** la server action de carrito/checkout rechaza a usuario no verificado (no solo se oculta el botón).
- **Onboarding:** `submitOnboarding` crea org PENDING + member OWNER + TaxDocument; redirige a pending.
- **Aprobación:** approve → VERIFIED + taxExempt + `customer.verified`; reject → REJECTED + reason + `customer.rejected`.
- **Email:** aprobar/rechazar disparan el email correcto (vía bus, idempotente).
- **E2e:** registrarse → onboarding (sube cert) → pending → admin aprueba → el usuario ya ve precios y puede comprar.

## 10. SEO

- Landing, catálogo, categorías y PDPs públicos con `generateMetadata` (PDP ya lo tiene de Fase 4). El precio oculto no afecta la indexación del contenido.
- `robots`/sitemap: incluir landing + PDPs públicos.

## 11. Fuera de alcance (YAGNI)

- Validación externa del certificado contra organismos estatales (sigue siendo decisión humana del admin).
- Multi-org por usuario en el onboarding (el alta crea una org; unirse a otra usa el flujo de invitaciones existente).
- Auto-aprobación (se descartó a favor de aprobación manual).

## 12. Consecuencias

- Los PDPs quedan **públicos** → se conserva el SEO y el contenido de Fase 4 (mejor canal inbound). Lo único oculto al anónimo es el **precio**.
- El gate baja de "todo el storefront" a "precio + compra + cuenta", lo que exige separar el grupo de rutas público del gated.
- Cambia el comportamiento previo (auto-aprobación) → ajustar `modules/verification` y la subida admin.
