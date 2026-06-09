/**
 * Convención app-wide para feedback de interacción (2026-06-04).
 *
 * Cada server action que el usuario dispara desde el storefront/admin debe:
 *
 *  - Si tiene que NAVEGAR tras la acción → `redirect(toastUrl(...))`. La URL
 *    destino lleva `?toast=success|error&msg=<i18n-key>&vars=<encoded-json>`.
 *    El `<ToastFlashReader>` global (en root layout) lee el query string al
 *    montar, renderiza el toast traducido, y limpia la URL con `replaceState`.
 *
 *  - Si NO navega (form inline, estado se queda en la misma pantalla) →
 *    devolver `ActionResult` y el form lo consume con `useFormState` para
 *    disparar el toast manualmente.
 *
 * `messageKey` es siempre una key de `lib/i18n/messages.ts` — no texto crudo.
 * `vars` opcional para interpolación (ej {brand}, {count}).
 */

export interface ActionResult {
  ok: boolean
  /** i18n key (no texto crudo). */
  messageKey?: string
  /** Variables para interpolar en t(). */
  vars?: Record<string, string | number>
}

export type ToastVariant = 'success' | 'error' | 'info'

/**
 * Helper para construir URL con toast embebido. Usado por server actions que
 * hacen `redirect(toastUrl(...))`.
 *
 * Ej: `toastUrl('/admin/customers/abc', 'success', 'admin.toast.approved')`
 */
export function toastUrl(
  path: string,
  variant: ToastVariant,
  messageKey: string,
  vars?: Record<string, string | number>
): string {
  const url = new URL(path, 'http://localhost') // base placeholder, descartada
  url.searchParams.set('toast', variant)
  url.searchParams.set('msg', messageKey)
  if (vars && Object.keys(vars).length > 0) {
    url.searchParams.set('vars', encodeURIComponent(JSON.stringify(vars)))
  }
  return `${url.pathname}${url.search}`
}

/** Estado inicial neutro para `useFormState`. */
export const INITIAL_ACTION_RESULT: ActionResult = { ok: false }
