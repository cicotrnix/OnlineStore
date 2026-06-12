/**
 * StepIcons — three Tabler outline icons (MIT, https://tabler.io/icons) inlined
 * to avoid adding a runtime dependency for three glyphs. Used by the "How it
 * works" section on the Home: file-upload (step 1 register), shield-check
 * (step 2 approval), shopping-cart (step 3 buy). Outline 1.75 stroke, square
 * caps/joins per Tabler defaults.
 */

type IconProps = { className?: string }

const baseProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
}

export function IconFileUpload({ className }: IconProps) {
  return (
    <svg {...baseProps} aria-hidden="true" className={className}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M12 11v6" />
      <path d="M9.5 13.5l2.5 -2.5l2.5 2.5" />
    </svg>
  )
}

export function IconShieldCheck({ className }: IconProps) {
  return (
    <svg {...baseProps} aria-hidden="true" className={className}>
      <path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06" />
      <path d="M15 19l2 2l4 -4" />
    </svg>
  )
}

export function IconShoppingCart({ className }: IconProps) {
  return (
    <svg {...baseProps} aria-hidden="true" className={className}>
      <circle cx="6" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
      <path d="M17 17h-11v-14h-2" />
      <path d="M6 5l14 1l-1 7h-13" />
    </svg>
  )
}

export const STEP_ICONS = [IconFileUpload, IconShieldCheck, IconShoppingCart] as const
