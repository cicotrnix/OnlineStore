/**
 * HeroBattery — minimal stylized battery SVG for the Home hero.
 *
 * Visual: vertical battery (cap + outlined body). The lime charge fill is a
 * plain (rx=0) <rect> clipped by the inner-well rounded-rect <clipPath>. The
 * clip keeps the corners properly rounded while scaleY animates the rect from
 * the bottom — the top edge stays a flat horizontal line as the fill rises
 * and falls, like a real battery indicator. SSR default is scaleY(0.7) so the
 * page looks charged without JS and under prefers-reduced-motion.
 *
 * Identifiers consumed by HomeMotion:
 *   - data-hero-battery       : root <svg>
 *   - data-hero-battery-fill  : the lime <rect> (scaleY + opacity tween)
 *   - data-hero-battery-bolt  : the bolt <path> (subtle opacity pulse)
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
      <defs>
        <clipPath id="hero-battery-well" clipPathUnits="userSpaceOnUse">
          <rect x="32" y="30" width="156" height="288" rx="16" />
        </clipPath>
      </defs>

      {/* Cap — flush on top of the body, narrower than before for proportion. */}
      <rect x="82" y="0" width="56" height="18" rx="4" fill="#88D810" />

      {/* Body outline. */}
      <rect
        x="20"
        y="18"
        width="180"
        height="312"
        rx="26"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />

      {/* Inner well — slate slightly lighter than the tile bg so the empty
          area reads as glass, not void. Defines the bottom layer of the well. */}
      <rect x="32" y="30" width="156" height="288" rx="16" fill="#1F2533" />

      {/* Charge fill — anchored at the well's bottom edge (y=318). Initial
          SSR / reduced-motion state is 70% charged: height 202, y = 318-202 = 116.
          HomeMotion animates `y` and `height` attributes directly (via GSAP's
          attr plugin); animating SVG attrs is more reliable across renderers
          than CSS transform-box + transform-origin on <rect>. The clipPath
          keeps the corners rounded; this rect itself has no rx so the top
          edge of the fill is always a flat horizontal charging line. */}
      <g clipPath="url(#hero-battery-well)">
        <rect data-hero-battery-fill x="32" y="116" width="156" height="202" fill="#88D810" />
      </g>

      {/* Bolt — slate ink. Sits in the upper-middle so it stays visible
          across the rise/empty cycle. Re-anchored to the new well geometry. */}
      <path
        data-hero-battery-bolt
        d="M118 100 L86 180 L106 180 L98 234 L138 152 L116 152 Z"
        fill="#1A1F2E"
        fillOpacity="0.92"
      />
    </svg>
  )
}
