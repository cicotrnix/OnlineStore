# Fix bloqueante — flujo de comprador: org activa + páginas huérfanas

> Brief Cowork → Claude Code CLI. **Bloqueante de launch** (flujo de compra roto para usuarios nuevos). Branch nueva desde `main`. TDD/e2e. Gate verde. No mergear.
> Confirmado en prod por smoke: tras registrarse, la org activa no queda seteada → carrito/órdenes/facturas/aprobaciones/RFQ fallan; y las páginas de `(account)` no tienen navbar.

## Bug A — páginas huérfanas (sin navbar) en `(account)`

`app/(account)/layout.tsx` es `return <>{children}</>` (passthrough vacío). Las rutas `(account)` (`orders`, `orders/[id]`, `orders/[id]/payment-pending`, `select-org`, `account`/mi-cuenta) renderizan sin header → el usuario queda en una página muerta sin navegación.

`app/(storefront)/layout.tsx` sí tiene el header completo (logo, SearchBar, carrito, links a quotes/invoices/orders, NotificationBadge, LocaleSwitch, SignOutButton, ImpersonationBanner, ChatWidget).

**Fix:** extraer el header a un componente compartido y usarlo en ambos layouts.

1. Crear `components/commerce/StoreHeader.tsx` — **async server component** que hace su propio data-fetching (replicar lo que hoy hace `(storefront)/layout.tsx`: `auth()`, cart count vía `cartService.get`, locale, impersonation name, feature flags `isFeatureEnabled('rfq')`, etc.) y renderiza el `<header>` + `ImpersonationBanner`. Mover ahí el JSX del header que hoy está inline en el storefront layout.
2. `(storefront)/layout.tsx` → usar `<StoreHeader />` + conservar `ChatWidget` y el `<main>`.
3. `(account)/layout.tsx` → renderizar `<StoreHeader />` + `<main>{children}</main>` (mismo shell que storefront). Mantener `export const dynamic = 'force-dynamic'`.
4. Verificar que no se rompe la maintenance/`maintainCurrentSession()` (hoy se llama en el storefront layout; si el header compartido la necesita, dejarla en los layouts, no duplicada).

Resultado: órdenes, detalle de orden, select-org y mi-cuenta quedan con navbar y navegación.

## Bug B — resolución de org activa centralizada + onboarding la setea

**Causa:** `submitOnboardingAction` crea la org + membresía pero **no** setea `session.activeOrgId`. Y ~8 lugares leen `session.activeOrgId` directo sin fallback, rompiendo cuando es `null`. El catálogo no se rompe porque usa `getCustomerState()` (auto-pick de la primera membresía).

### B.1 — Helper centralizado

En `lib/auth/customer.ts` (o `lib/auth/active-org.ts`), exportar:

```ts
/** orgId efectivo: impersonation > activeOrgId > única membresía. null si 0 o si hay varias sin elegir. */
export async function resolveActiveOrgId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const explicit = session.impersonatingOrgId ?? session.activeOrgId
  if (explicit) return explicit
  const members = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
    take: 2,
  })
  if (members.length === 1 && members[0]) return members[0].organizationId
  return null // 0 membresías, o varias sin elegir → el caller decide
}

/** Igual pero redirige a /select-org si no se puede resolver (varias orgs sin elegir). */
export async function requireActiveOrgId(): Promise<string> {
  const orgId = await resolveActiveOrgId()
  if (!orgId) redirect('/select-org')
  return orgId
}
```

### B.2 — Reemplazar los reads directos

Usar el helper en (mínimo) estos, reemplazando `session.activeOrgId` directo:
- `app/(account)/orders/page.tsx:15`
- `app/(storefront)/_actions.ts:24` (helper de org para carrito → **esto arregla agregar-al-carrito**)
- `app/(storefront)/approvals/page.tsx` (L20/21/25)
- `app/(storefront)/invoices/page.tsx` (L24/27) y `app/(storefront)/invoices/[id]/page.tsx` (L21/27)
- `app/(storefront)/quotes/page.tsx`, `quotes/[id]/page.tsx`, `quotes/draft/page.tsx`, `quotes/_actions.ts` (**arregla RFQ**)

Regla: donde hoy hacen `notFound()` por falta de org, ahora resolver con `resolveActiveOrgId()`; si sigue null (varias orgs sin elegir), `redirect('/select-org')` en páginas, o error claro en acciones. Mantener los checks de pertenencia/ownership existentes (ej. `inv.organizationId !== orgId`).
Los `?? null` graceful (`products/[slug]`, `search`, `api/ai/chat`) pueden quedar igual o usar `resolveActiveOrgId()` por consistencia — no es bloqueante.

### B.3 — Onboarding setea la org activa

En `app/(onboarding)/onboarding/_actions.ts#submitOnboardingAction`, después de `createOrganizationWithOwner` (y antes del redirect), setear la nueva org como activa — reusar `switchActiveOrg(org.id)` de `lib/auth/actions.ts` (ya hace el update de `Session.activeOrgId` vía cookie token). Así el usuario nuevo queda listo sin pasar por `/select-org`.

## Testing (TDD/e2e)

- Unit de `resolveActiveOrgId`: impersonation gana; activeOrgId explícito; única membresía → auto; cero → null; dos sin elegir → null.
- E2e (Playwright, patrón existente): usuario verificado con 1 org y `activeOrgId` null → `/orders` y `/cart` resuelven (no "elegí una organización"), y la página tiene navbar (`<header>` / link a catálogo presente). Y: `(account)/orders` renderiza el header.
- Regresión: la suite existente verde.

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` + `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` verdes (incl. paridad EN/ES si tocás i18n).
2. Manual/e2e: registrar negocio nuevo → verificar → **sin pasar por /select-org**, agregar al carrito + checkout + ver órdenes/facturas + navbar presente en todas.
3. Sin tocar `MAINTENANCE_MODE`, schema Prisma, adaptadores de pago.
4. Commits chicos por parte (A layout, B helper+reads, B onboarding). Push + PR. **No mergear** — review en Cowork.

## Fuera de alcance (no en este PR)

- i18n: inglés ya es el default (`locale.default: 'en-US'`); la cobertura incompleta (admin = FU-002, emails = FU-006, strings sueltos del storefront) es un barrido aparte. No mezclar acá.
