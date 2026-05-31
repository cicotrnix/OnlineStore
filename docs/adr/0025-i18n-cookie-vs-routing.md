# ADR 0025 — i18n cookie-based + `User.preferredLocale` (not path routing)

Date: 2026-05-30
Status: Accepted (Fase 4 Corte 0.5)

## Context

Fase 4 introduces bilingual EN/ES product content. The storefront must resolve the active locale per request to render `ProductContent` (ADR 0022) in the correct language. Options:

- **A. Path routing** (`/[locale]/catalog`, `/[locale]/products/...`) — Next.js native i18n. Best for SEO multi-idioma (cada locale tiene URL única, Google indexa por separado). Requiere reestructurar todas las rutas + middleware + redirects.
- **B. Cookie + DB preference** — server-side reads cookie (`locale=es-419`); logueado puede sobreescribir vía `User.preferredLocale`. URLs no cambian.
- **C. `Accept-Language` negotiation** — header del browser. UX automática pero no persistente y el usuario no puede forzar otro idioma sin VPN/extensión.
- **D. Librería externa** (next-intl, next-i18next) — features avanzados (plurales, ICU, hot-reload), peso adicional.

## Decision

Opción B: cookie `locale` + `User.preferredLocale` (Prisma `String?` en `User`). Sin routing por path. Sin librería externa.

Fallback chain (en `lib/i18n/getLocale`):
1. `User.preferredLocale` (si el request es de un usuario logueado y el valor es soportado).
2. Cookie `locale` (si está seteada con un valor soportado).
3. `DEFAULT_LOCALE = 'en-US'`.

Diccionario de strings UI vive en `lib/i18n/messages.ts` (objeto plano con keys hardcoded). Helper `t(locale, key)` hace lookup directo con fallback a EN si la key no existe en el locale activo. Sin interpolación, sin plurales, sin ICU.

`isSupportedLocale` valida el valor en tres bordes: server action (`setLocaleAction`), cookie read, y DB read del campo `preferredLocale`.

## Consequences

Positive:
- Zero refactor de rutas. `/`, `/catalog`, `/products/[slug]` siguen igual.
- Cero dependencias nuevas — la infra es ~150 líneas de código propio.
- Persistencia para usuarios logueados (DB) + persistencia para anónimos (cookie 1 año).
- El switch del idioma es un select + server action; no requiere client-side router shenanigans.
- Renderizar `ProductContent` del locale activo es un `findFirst({ where: { productId, locale } })` con fallback a EN — trivial.

Negative:
- **Sin SEO multi-idioma.** Google ve una sola URL por producto. Si en el futuro queremos rankear "batería iPhone 14" en ES separado de "iPhone 14 battery" en EN, hay que migrar a routing por path. La migración no es trivial pero es contained — `getLocale` se reemplaza por el segmento de URL y el resto sigue igual.
- **Sin `Accept-Language` automático.** Usuario nuevo de Latinoamérica ve EN por default hasta que toque el switch. Aceptable; podemos agregar negociación más tarde sin breaking changes.
- **Diccionarios chicos hardcoded.** Si crecemos a >50 strings, conviene mover a JSON files por locale o adoptar next-intl. Re-evaluar entonces.

## Alternativas rechazadas

- **Path routing**: overkill para 2 locales sin SEO target todavía. YAGNI.
- **Accept-Language only**: no persiste preferencia explícita; un usuario LATAM con navegador en EN nunca vería ES.
- **next-intl / lingui**: features no necesarios (plurales, ICU); peso bundle innecesario.

## References

- `lib/i18n/locale.ts` — `getLocale`, cookie constants
- `lib/i18n/messages.ts` — diccionarios + helper `t`
- `lib/i18n/index.ts` — superficie pública
- `prisma/schema.prisma` — `User.preferredLocale`
- `components/commerce/LocaleSwitch.tsx` — switch en header
- `app/(storefront)/_actions.ts` — `setLocaleAction`
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §2.2, §14.4
