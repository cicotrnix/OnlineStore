'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Hero gauge geometry — must match HeroGauge.tsx well coords (x=14 y=38 w=272 h=428).
const WELL_TOP = 38
const WELL_HEIGHT = 428
const WELL_BOTTOM = WELL_TOP + WELL_HEIGHT // 466 — bottom edge of fill anchor
const FILL_DURATION_S = 2.4
const REVEAL_OFFSET_PX = 22 // per "Back to 100%" spec

export function HomeMotion(): null {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      // ── Hero gauge ── one-shot 0→100 with counter in sync; freeze at 100%.
      const fill = document.querySelector<SVGRectElement>('[data-hero-gauge-fill]')
      const pct = document.querySelector<HTMLElement>('[data-hero-pct]')

      if (prefersReduced) {
        // Static state — SSR already renders 100% / "100"; nothing to do.
      } else if (fill && pct) {
        // Start empty (override the SSR-full state)
        gsap.set(fill, { attr: { y: WELL_BOTTOM, height: 0 } })
        pct.textContent = '0'
        const counter = { v: 0 }
        gsap
          .timeline({ delay: 0.25 })
          .to(fill, {
            attr: { y: WELL_TOP, height: WELL_HEIGHT },
            duration: FILL_DURATION_S,
            ease: 'power3.out',
          })
          .to(
            counter,
            {
              v: 100,
              duration: FILL_DURATION_S,
              ease: 'power3.out',
              onUpdate: () => {
                pct.textContent = String(Math.round(counter.v))
              },
            },
            '<'
          )
      }

      // ── Hero text stagger ── only when motion is allowed.
      if (!prefersReduced) {
        const heroSteps = gsap.utils.toArray<HTMLElement>('[data-motion="hero"] [data-motion-step]')
        if (heroSteps.length > 0) {
          gsap.from(heroSteps, {
            y: REVEAL_OFFSET_PX,
            autoAlpha: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.07,
            clearProps: 'transform,opacity,visibility',
          })
        }
      }

      // ── Steps section ── connecting journey line draws + cards stagger reveal.
      if (!prefersReduced) {
        const stepsRoot = document.querySelector<HTMLElement>('[data-motion="steps"]')
        if (stepsRoot) {
          const horizLine = stepsRoot.querySelector<HTMLElement>('[data-steps-line="horizontal"]')
          const vertLine = stepsRoot.querySelector<HTMLElement>('[data-steps-line="vertical"]')
          const items = gsap.utils.toArray<HTMLElement>('[data-motion="steps"] [data-motion-item]')

          if (horizLine) gsap.set(horizLine, { scaleX: 0 })
          if (vertLine) gsap.set(vertLine, { scaleY: 0 })

          ScrollTrigger.create({
            trigger: stepsRoot,
            start: 'top 82%',
            once: true,
            onEnter: () => {
              const tl = gsap.timeline()
              if (horizLine) {
                tl.to(horizLine, { scaleX: 1, duration: 1.1, ease: 'power3.out' }, 0)
              }
              if (vertLine) {
                tl.to(vertLine, { scaleY: 1, duration: 1.1, ease: 'power3.out' }, 0)
              }
              tl.from(
                items,
                {
                  y: REVEAL_OFFSET_PX,
                  autoAlpha: 0,
                  duration: 0.65,
                  ease: 'power3.out',
                  stagger: 0.06,
                  clearProps: 'transform,opacity,visibility',
                },
                0.15
              )
            },
          })
        }
      }

      // ── Generic [data-reveal] ScrollTrigger reveal — used by stats / featured / band.
      if (!prefersReduced) {
        const revealItems = gsap.utils.toArray<HTMLElement>('[data-reveal]')
        revealItems.forEach((el, i) => {
          gsap.from(el, {
            y: REVEAL_OFFSET_PX,
            autoAlpha: 0,
            duration: 0.7,
            ease: 'power3.out',
            delay: (i % 4) * 0.06,
            clearProps: 'transform,opacity,visibility',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })
      }
    })

    return () => {
      ctx.revert()
    }
  }, [])

  return null
}
