/**
 * Gauge estático al 100% para el panel de marca de auth. SVG propio, sin GSAP
 * ni estado — auth se mantiene liviana (no se infla el bundle con motion).
 * Decorativo (el panel entero es aria-hidden).
 */
export function AuthGauge() {
  const r = 54
  const circumference = 2 * Math.PI * r
  return (
    <svg
      width="148"
      height="148"
      viewBox="0 0 148 148"
      aria-hidden="true"
      className="drop-shadow-[0_0_24px_rgba(136,216,16,0.25)]"
    >
      <circle cx="74" cy="74" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
      <circle
        cx="74"
        cy="74"
        r={r}
        fill="none"
        stroke="#88d810"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={0}
        transform="rotate(-90 74 74)"
      />
      <text
        x="74"
        y="74"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="30"
        fontWeight="700"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        100%
      </text>
    </svg>
  )
}
