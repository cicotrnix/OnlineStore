import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'

/**
 * HeroGauge — the "Back to 100%" signature moment. A vertical battery that
 * fills from 0% to 100% one-time (no cycle) while a counter ticks 0→100 in
 * sync; both freeze at 100%. Two floating chips around the gauge anchor the
 * narrative: "0 cycle count" + "+12% capacidad vs OEM".
 *
 * The motion is driven by HomeMotion.tsx via three hooks rendered here:
 *   - `[data-hero-gauge-fill]` : the lime fill <rect> (animate `y` + `height`)
 *   - `[data-hero-pct]`        : the percent counter <span> (animate textContent)
 *   - `[data-hero-gauge]`      : the root container (entry/animation trigger)
 *
 * SSR default = 100% (filled, counter "100") so the gauge looks correct under
 * `prefers-reduced-motion` (no JS swap) and as a non-JS fallback.
 */
export function HeroGauge({ locale }: { locale: Locale }) {
  return (
    <div data-hero-gauge className="relative mx-auto h-[440px] w-[280px] md:h-[480px] md:w-[300px]">
      {/* Battery SVG. Cap on top, body, inner well, fill (animated), bolt. */}
      <svg viewBox="0 0 300 480" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="hero-batt-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e2433" />
            <stop offset="1" stopColor="#171c28" />
          </linearGradient>
          <linearGradient id="hero-batt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9bea1f" />
            <stop offset="1" stopColor="#7cc40d" />
          </linearGradient>
          <clipPath id="hero-batt-well" clipPathUnits="userSpaceOnUse">
            <rect x="14" y="38" width="272" height="428" rx="22" />
          </clipPath>
        </defs>

        {/* Cap */}
        <rect x="108" y="0" width="84" height="20" rx="4" fill="rgba(255,255,255,0.14)" />

        {/* Body */}
        <rect
          x="2"
          y="20"
          width="296"
          height="458"
          rx="34"
          fill="url(#hero-batt-body)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="3"
        />

        {/* Inner well (slightly lighter than body — reads as glass, not void) */}
        <rect x="14" y="38" width="272" height="428" rx="22" fill="#1f2533" />

        {/* Charge fill — y/height animated. SSR default = 100% so static state
            is correct without JS. */}
        <g clipPath="url(#hero-batt-well)">
          <rect
            data-hero-gauge-fill
            x="14"
            y="38"
            width="272"
            height="428"
            fill="url(#hero-batt-fill)"
          />
        </g>

        {/* Bolt — centered, slate ink on lime fill */}
        <path
          d="M165 170 L116 270 L142 270 L132 350 L184 240 L156 240 Z"
          fill="#1A1F2E"
          fillOpacity="0.78"
        />
      </svg>

      {/* Readout — big % counter + label, overlaid near the bottom of the gauge.
          Slate text is AAA against the lime fill at the bottom. */}
      <div className="absolute inset-x-0 bottom-[44px] text-center">
        <div className="font-sans font-extrabold tracking-[-0.04em] leading-none text-ink-950">
          {/* Sin aria-live: GSAP muta este contador por frame (0→100); con
              aria-live un lector de pantalla recibiría una ráfaga de anuncios. */}
          <span data-hero-pct className="text-[52px] md:text-[58px]">
            100
          </span>
          <span className="text-[22px] md:text-[26px] font-bold align-super">%</span>
        </div>
        <div className="mt-1 font-mono text-[10.5px] md:text-[11.5px] uppercase tracking-[0.14em] text-ink-950/70">
          {t(locale, 'landing.hero.gaugeLabel')}
        </div>
      </div>

      {/* Chip 1 — "0 / cycle count" */}
      <div className="absolute right-[-12px] top-[60px] md:right-[-26px] flex flex-col gap-[2px] rounded-[14px] bg-surface px-[14px] py-[10px] text-ink-700 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]">
        <span className="font-mono text-[16px] md:text-[18px] font-semibold tracking-[-0.01em] text-ink-950">
          0
        </span>
        <span className="text-[10.5px] text-ink-500 tracking-[0.02em]">
          {t(locale, 'landing.hero.chip1Label')}
        </span>
      </div>

      {/* Chip 2 — "+12% / capacidad vs OEM" */}
      <div className="absolute right-[-18px] bottom-[110px] md:right-[-34px] flex flex-col gap-[2px] rounded-[14px] bg-surface px-[14px] py-[10px] text-ink-700 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]">
        <span className="font-mono text-[16px] md:text-[18px] font-semibold tracking-[-0.01em] text-ink-950">
          <span className="text-lime-deep">+</span>12%
        </span>
        <span className="text-[10.5px] text-ink-500 tracking-[0.02em]">
          {t(locale, 'landing.hero.chip2Label')}
        </span>
      </div>
    </div>
  )
}
