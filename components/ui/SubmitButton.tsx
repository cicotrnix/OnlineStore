'use client'

import { Button, type ButtonProps } from '@/components/ui/Button'
import { useFormStatus } from 'react-dom'

type Props = Omit<ButtonProps, 'type' | 'disabled'> & {
  /** Texto mientras la action está pending. Default: muestra '…'. */
  pendingLabel?: string
  /** Mensaje opcional para `window.confirm()` antes del submit. */
  confirmMessage?: string
  children: React.ReactNode
}

/**
 * Submit button único de la app (regla 2026-06-04 — interaction feedback).
 *
 *  - Usa `useFormStatus` para deshabilitarse mientras la server action está
 *    pending. Evita doble-click / doble-submit.
 *  - Muestra `pendingLabel` (o '…') durante el pending.
 *  - `confirmMessage` opcional: si el usuario cancela, no se hace submit.
 *
 * Reemplaza todos los `<Button type="submit">` crudos en forms.
 */
export function SubmitButton({
  pendingLabel,
  confirmMessage,
  children,
  variant = 'primary',
  size,
  className,
  ...rest
}: Props) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
      aria-busy={pending}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
      {...rest}
    >
      {pending ? (pendingLabel ?? '…') : children}
    </Button>
  )
}
