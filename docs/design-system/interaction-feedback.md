# Interaction feedback — convención app-wide

> Regla, no sugerencia. Toda interacción del usuario (cada form/submit) debe
> dar dos señales: **estado de carga** y **confirmación de resultado**. Sin
> excepción.

Versión: 2026-06-04 · stack: Next 14 App Router + React 19 server actions.

## Piezas

### `components/ui/SubmitButton.tsx`

Único submit button de la app. Usa `useFormStatus`:

```tsx
<SubmitButton pendingLabel={t(locale, 'cta.sending')} variant="primary">
  {t(locale, 'cta.submit')}
</SubmitButton>
```

- Disabled mientras la server action está pending (evita doble-click).
- Cambia el label a `pendingLabel` durante el pending.
- `confirmMessage` opcional dispara `window.confirm()` antes del submit.
- `aria-busy` automático.

**Prohibido**: `<button type="submit">` o `<Button type="submit">` crudos.
Si encontrás uno en un form de cara al usuario, refactorizar.

### `components/ui/Toaster.tsx` + `toast`

Toaster global montado UNA vez en el root layout. Re-export del API de `sonner`:

```tsx
import { toast } from '@/components/ui/Toaster'

toast.success(t(locale, 'admin.toast.approved'))
toast.error(t(locale, 'cart.toast.removeFailed'))
```

### `ActionResult` (`lib/feedback/action-result.ts`)

```ts
export interface ActionResult {
  ok: boolean
  messageKey?: string  // i18n key, no texto crudo
  vars?: Record<string, string | number>
}
```

Las server actions que **NO navegan** devuelven `ActionResult`; el form usa
`useActionState` para disparar el toast.

```tsx
// server
'use server'
export async function sendMagicLinkAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get('email'))
  await signIn('resend', { email })
  return { ok: true, messageKey: 'auth.toast.linkSent', vars: { email } }
}

// client
'use client'
const [state, formAction] = useActionState(sendMagicLinkAction, INITIAL_ACTION_RESULT)
useEffect(() => {
  if (state.messageKey) {
    const msg = t(locale, state.messageKey, state.vars)
    if (state.ok) toast.success(msg)
    else toast.error(msg)
  }
}, [state, locale])
```

### `toastUrl(path, variant, messageKey, vars?)`

Para acciones que **NAVEGAN** (redirect tras la acción). Construye una URL
con `?toast=success&msg=<key>&vars=<encoded>` y luego:

```ts
redirect(toastUrl(`/admin/customers/${id}`, 'success', 'admin.toast.approved'))
```

`<ToastFlashReader locale={locale} />` (montado en root layout) lee los
query params al mount, dispara el toast traducido y limpia la URL via
`replaceState`. Un refresh no re-dispara.

## Reglas

1. **Cada form `<form action={serverAction}>`** debe usar `<SubmitButton>`. Excepción única: forms internos del admin de un solo botón "Buscar" — pueden seguir usando Button crudo solo si no escriben/mutan estado.
2. **Cada server action** debe devolver `ActionResult` o terminar con `redirect(toastUrl(...))`. Throws sin feedback no se permiten para acciones de usuario (los throws de validación deben capturarse y mapearse a `{ ok: false, messageKey: 'errors.xxx' }`).
3. **Los textos** (`pendingLabel`, mensajes de toast) **siempre vienen de `t()`**. Sin strings hardcodeados.
4. **No `alert()`** ni `confirm()` salvo `confirmMessage` de SubmitButton.
5. **No banner inline** salvo errores de validación contextuales (con i18n).

## Tests por componente

- SubmitButton: render normal + pending (estado mockeado `useFormStatus`).
- ToastFlashReader: render con `?toast=success&msg=key` → llama `toast.success` con el mensaje correcto.
- ActionResult roundtrip: server action devuelve { ok, messageKey } → form llama toast.
- `t()` paridad: cada key nueva debe existir en EN y ES.

## Onboarding contributors

Cuando agregues un form nuevo:

1. Form action devuelve `ActionResult` o termina con `redirect(toastUrl(...))`.
2. Submit con `<SubmitButton pendingLabel={...}>`.
3. Si NO navega: client wraps con `useActionState`, useEffect dispara `toast.*`.
4. Si navega: usar `toastUrl(...)`.
5. Agregá las keys de mensaje en `lib/i18n/messages.ts` para EN + ES.
6. PR sin estas tres patas se rechaza.
