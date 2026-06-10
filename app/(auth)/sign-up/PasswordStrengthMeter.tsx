'use client'

/**
 * Tiny password strength meter (Task 7).
 *
 * Scoring (0–4) driven by length + character variety. The gate enforced by
 * `validatePasswordPolicy` (min 8 + letter + number) is intentionally labeled
 * "Weak" — we only show "Strong" when length ≥ 12 OR full variety
 * (upper + lower + number + symbol).
 */
export function computePasswordScore(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length
  if (variety >= 2) score++
  if (variety >= 3) score++
  return Math.min(score, 4)
}

type Props = {
  password: string
  weakLabel: string
  mediumLabel: string
  strongLabel: string
}

export function PasswordStrengthMeter({ password, weakLabel, mediumLabel, strongLabel }: Props) {
  const score = computePasswordScore(password)
  const label = score >= 4 ? strongLabel : score >= 3 ? mediumLabel : weakLabel
  const colors = ['bg-gray-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i <= score ? colors[score] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {password && <p className="mt-1 text-xs text-gray-500">{label}</p>}
    </div>
  )
}
