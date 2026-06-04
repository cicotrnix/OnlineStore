'use client'

import { Button } from '@/components/ui/Button'
import { useFormStatus } from 'react-dom'

type Props = {
  /** Mensaje opcional para confirm() previo al submit. */
  confirmMessage?: string
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}

/**
 * Botón de submit que:
 *  - opcionalmente pide confirm() al usuario antes de enviar.
 *  - se deshabilita automáticamente mientras la server action está pending
 *    (evita doble-clic / doble-submit).
 */
export function SubmitOnceButton({ confirmMessage, variant = 'primary', children }: Props) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
    >
      {pending ? '…' : children}
    </Button>
  )
}
