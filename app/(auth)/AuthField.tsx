import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  name: string
  label: string
  /** Mensaje de error; si está, marca aria-invalid + aria-describedby. */
  error?: string
  /** Oculta el label visualmente (sr-only) pero lo mantiene accesible. */
  labelHidden?: boolean
}

/**
 * Primitivo de campo de la superficie auth: `<label>` real (cierra el gap de
 * placeholder-only), input estilizado "Back to 100%", y slot de error con
 * `role="alert"` + `aria-invalid`/`aria-describedby`. DRY para los cinco forms.
 */
export function AuthField({ name, label, error, labelHidden, className, ...input }: Props) {
  const id = `auth-${name}`
  const errorId = `${id}-error`
  return (
    <div>
      <label
        htmlFor={id}
        className={
          labelHidden ? 'sr-only' : 'block text-xs font-medium uppercase tracking-wide text-ink-500'
        }
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 w-full rounded-button border bg-surface px-3 py-2.5 text-sm text-ink-950 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent ${
          error ? 'border-red-400' : 'border-ink-100'
        } ${className ?? ''}`}
        {...input}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
