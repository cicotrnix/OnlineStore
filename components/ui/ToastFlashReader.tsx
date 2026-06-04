'use client'

import { type Locale, t as translate } from '@/lib/i18n/messages'
import { useEffect } from 'react'
import { toast } from 'sonner'

type Props = {
  locale: Locale
}

/**
 * Lee `?toast=success|error|info&msg=<i18n-key>&vars=<encoded-json>` del
 * query string al montar, dispara el toast traducido y limpia la URL con
 * `replaceState` (sin navegación adicional).
 *
 * Permite que server actions que hacen `redirect(toastUrl(...))` muestren
 * feedback al usuario tras navegar.
 */
export function ToastFlashReader({ locale }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const variant = url.searchParams.get('toast')
    const msgKey = url.searchParams.get('msg')
    const varsRaw = url.searchParams.get('vars')
    if (!variant || !msgKey) return

    let vars: Record<string, string | number> | undefined
    if (varsRaw) {
      try {
        vars = JSON.parse(decodeURIComponent(varsRaw))
      } catch {
        /* ignore malformed */
      }
    }

    const message = translate(locale, msgKey as never, vars)
    if (variant === 'error') toast.error(message)
    else if (variant === 'info') toast.info(message)
    else toast.success(message)

    // Limpiar la URL para que un refresh no re-dispare el toast.
    url.searchParams.delete('toast')
    url.searchParams.delete('msg')
    url.searchParams.delete('vars')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [locale])

  return null
}
