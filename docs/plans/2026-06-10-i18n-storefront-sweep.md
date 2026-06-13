# Barrido i18n — storefront (strings sueltos)

> Brief Cowork → Claude Code CLI. Branch nueva desde `main`. Gate verde. No mergear.
> Alcance: SOLO el storefront (cara al cliente). Admin = FU-002, emails = FU-006 (aparte, NO en este PR).

## Objetivo

El storefront está mayormente traducido, pero quedan **strings hardcodeados sueltos** (texto JSX, placeholders, aria-labels, labels de botón) que no pasan por `t(locale, …)`. Pasarlos todos a i18n con paridad EN/ES.

## Alcance

- `app/(storefront)/**` (todas las páginas del grupo storefront)
- `app/page.tsx` (homepage)
- `components/commerce/**` y `components/storefront/**`
- **NO tocar:** `app/admin/**`, `modules/notifications/**` (emails), ni nada fuera del storefront.

## Cómo encontrarlos

Texto JSX literal entre tags, placeholders, aria-labels y children de botón que no usan `t()`:

```
git grep -nE ">[A-Za-z]{3,}[^<{]*<" app/\(storefront\) app/page.tsx components/commerce components/storefront | grep -vE "\{t\(|className|import|aria-hidden|key=|=\{"
git grep -nE 'placeholder="[^"]|aria-label="[^"]|title="[^"]' app/\(storefront\) components/commerce components/storefront | grep -vE "\{t\("
```

Revisar cada match: si es texto visible al usuario y no pasa por `t()`, convertirlo.

## Cambio

- Para cada string hardcodeado: agregar una key en `lib/i18n/messages.ts` (union type `MessageKey` + bloque `en-US` + bloque `es-419`, **paridad obligatoria** — el test rompe si EN/ES no tienen las mismas keys), y reemplazar el literal por `t(locale, 'key')`.
- Naming consistente con las keys existentes del storefront.
- Donde el componente sea client y no tenga `locale`, recibirlo por props desde el server (patrón existente), o usar el `locale` ya disponible en la página.

## Aceptación (gate)

1. Los dos greps de arriba devuelven ~0 strings visibles sin `t()` en el storefront (los matches restantes deben ser código, no texto de usuario).
2. `pnpm format` (Biome) + `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` verdes, incluido el test de paridad EN/ES.
3. Sin tocar admin, emails, `MAINTENANCE_MODE`, pagos.
4. Commit chico, push, PR. **No mergear** — review en Cowork.
