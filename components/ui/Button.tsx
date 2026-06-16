import { cn } from '@/lib/utils/cn'
import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900',
  {
    variants: {
      variant: {
        primary: 'text-white shadow-sm hover:opacity-90',
        secondary: 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        // Variantes admin Back-to-100% (sin inline --color-primary; bg explícito
        // para no dejar pasar el slate del primaryStyle bajo important:true).
        lime: 'bg-accent text-ink-950 hover:bg-accent/90',
        outline:
          'bg-surface border border-line text-ink-700 hover:border-accent hover:text-ink-950',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2',
        lg: 'px-6 py-2.5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, style, ...props }: ButtonProps) {
  const primaryStyle =
    variant === 'primary' || variant == null
      ? { background: 'var(--color-primary)', ...style }
      : style
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      style={primaryStyle}
      {...props}
    />
  )
}
