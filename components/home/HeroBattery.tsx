/**
 * HeroBattery — minimal stylized battery SVG for the Home hero.
 *
 * Visual: vertical battery (cap + outlined body). The inner lime fill rect
 * is anchored at the bottom (`transform-origin: 50% 100%`,
 * `transform-box: fill-box`). It SSRs at ~70% charge so the page looks
 * right without JS / with reduced motion. HomeMotion takes over on mount
 * and runs the rise/hold/empty cycle.
 *
 * Identifiers consumed by HomeMotion:
 *   - data-hero-battery       : root <svg> (entry tween target)
 *   - data-hero-battery-fill  : the lime <rect> (scaleY + opacity tween)
 *   - data-hero-battery-bolt  : the bolt <path> (subtle pulse target)
 */
export function HeroBattery({ className }: { className?: string }) {
  return (
    <svg
      data-hero-battery
      viewBox="0 0 220 340"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Cap */}
      <rect x="76" y="0" width="68" height="22" rx="6" fill="#88D810" fillOpacity="0.85" />
      {/* Body outline */}
      <rect
        x="20"
        y="26"
        width="180"
        height="304"
        rx="26"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      {/* Inner well — defines the fill bounds. Slate slightly lighter
          than the tile bg so the empty area reads as glass, not void. */}
      <rect x="32" y="38" width="156" height="280" rx="16" fill="#1F2533" />
      {/* Charge fill — anchored at bottom; HomeMotion drives scaleY.
          Default scaleY(0.7) so SSR / no-JS / reduced-motion look correct. */}
      <rect
        data-hero-battery-fill
        x="32"
        y="38"
        width="156"
        height="280"
        rx="16"
        fill="#88D810"
        style={{
          transformBox: 'fill-box',
          transformOrigin: '50% 100%',
          transform: 'scaleY(0.7)',
        }}
      />
      {/* Bolt — slate ink on lime. Sits in the upper-middle so it stays
          visible across the rise/empty cycle. */}
      <path
        data-hero-battery-bolt
        d="M118 110 L86 188 L106 188 L98 240 L138 158 L116 158 Z"
        fill="#1A1F2E"
        fillOpacity="0.92"
      />
    </svg>
  )
}
