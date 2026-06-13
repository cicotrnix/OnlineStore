# Fix bloqueante — `useActionState` rompe sign-in en producción

> Brief Cowork → Claude Code CLI. **Bloqueante de launch** (login y registro caídos en prod). Branch nueva desde `main`. TDD/e2e. Gate verde. No mergear.

## Síntoma y causa

En prod (`pipower.shop/sign-in` y `/onboarding`), la página muestra "Something went wrong". Consola del navegador:

```
TypeError: (0, u.useActionState) is not a function or its return value is not iterable
```

**Causa:** `useActionState` es un hook de **React 19**. El proyecto corre **React 18.3.1 + Next 14.2.18** (ver `package.json`), donde ese hook **no existe** en runtime — el equivalente React 18 es `useFormState` de `react-dom`. `@types/react` 18.3 declara `useActionState` en los tipos, por eso typecheck/build pasaron y reventó recién en el navegador.

**Alcance:** `useActionState` se usa en **un solo archivo**: `app/(auth)/sign-in/SignInForm.tsx`. Por eso solo sign-in (y "Registrarse", que redirige a sign-in) fallan; el resto de la app anda.

## Decisión

Fix forward en el stack actual (React 18 / Next 14): cambiar `useActionState` → `useFormState` de `react-dom`. **NO** upgradear a Next 15 / React 19 (migración mayor, fuera de alcance de un launch). Cuando se upgradee en el futuro, se revierte a `useActionState`.

## Cambio

**File:** `app/(auth)/sign-in/SignInForm.tsx`

```diff
- import { useActionState, useEffect } from 'react'
+ import { useEffect } from 'react'
+ import { useFormState } from 'react-dom'
...
- const [state, formAction] = useActionState(signInAction, INITIAL_ACTION_RESULT)
+ const [state, formAction] = useFormState(signInAction, INITIAL_ACTION_RESULT)
```

`useFormState` tiene la misma firma `[state, formAction] = useFormState(action, initialState)` — drop-in. (`useFormStatus`, que ya usa `SubmitButton`, no se toca; ese sí existe en React 18.)

Opcional (higiene): actualizar los comentarios que mencionan `useActionState` en `app/(auth)/sign-in/actions.ts` y `lib/feedback/action-result.ts` para que digan `useFormState`. No funcional.

## Regresión — cerrar el gap de test (e2e)

El bug pasó CI porque ningún test renderiza `/sign-in` en un navegador real. Agregar/extender e2e (Playwright) — en `tests/e2e/` (ver `admin-auth.spec.ts` como patrón):

- Navegar a `/sign-in`.
- Assert que el **input de email** y el **botón de submit** están visibles (`getByPlaceholder`/`getByRole`), y que **NO** aparece el texto del error boundary ("Something went wrong").
- Esto falla si se reintroduce `useActionState` (la página caería al error boundary y el input no estaría).

(Nota: un unit test no alcanza — `@types/react` declara el hook, así que solo un render real en navegador lo caza.)

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` (Biome).
2. `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` — verde.
3. Nuevo e2e de `/sign-in` **verde**, y verificá que **falla** si revertís a `useActionState` (prueba de que el guard sirve).
4. Sin tocar `MAINTENANCE_MODE`, schema, pagos.
5. Commit: `fix(auth): use React 18 useFormState in SignInForm (useActionState is React 19)`. Push + PR. **No mergear** — review en Cowork. En la descripción: que esto es bloqueante de launch y que tras merge hay que verificar el login en prod con el bypass.
```
