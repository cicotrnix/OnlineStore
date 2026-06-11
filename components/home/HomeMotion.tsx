'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function HomeMotion(): null {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      // ── Battery ── default SSR state is scaleY(0.7) opacity 1. When motion
      // is allowed we override to scaleY(0) then play the charge loop. When
      // reduced motion is on, we leave the SSR state untouched.
      const fill = document.querySelector<SVGRectElement>('[data-hero-battery-fill]')
      const bolt = document.querySelector<SVGPathElement>('[data-hero-battery-bolt]')

      // Well geometry (HeroBattery): y range [30, 318]; full height = 288.
      // Animate the fill's `y` and `height` attributes directly so the bottom
      // edge stays anchored at y=318 regardless of charge level. More reliable
      // across renderers than transform-box + transform-origin on <rect>.
      const WELL_BOTTOM = 318
      const WELL_HEIGHT = 288
      const lvl = (frac: number) => ({
        y: WELL_BOTTOM - WELL_HEIGHT * frac,
        height: WELL_HEIGHT * frac,
      })

      if (!prefersReduced && fill) {
        gsap.set(fill, { attr: lvl(0), opacity: 1 })
        const chargeTl = gsap.timeline({ repeat: -1, delay: 0.4 })
        chargeTl.to(fill, { attr: lvl(0.78), duration: 2.4, ease: 'power2.out' })
        chargeTl.to(
          fill,
          { opacity: 0.82, duration: 0.9, yoyo: true, repeat: 1, ease: 'sine.inOut' },
          '<+0.4'
        )
        chargeTl.to(fill, { attr: lvl(0.18), duration: 1.0, ease: 'power2.in' }, '+=0.6')
        chargeTl.to({}, { duration: 0.4 })

        if (bolt) {
          gsap.to(bolt, {
            opacity: 0.65,
            duration: 1.4,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          })
        }
      }

      // ── Hero text stagger ── only when motion is allowed.
      if (!prefersReduced) {
        const heroSteps = gsap.utils.toArray<HTMLElement>('[data-motion="hero"] [data-motion-step]')
        if (heroSteps.length > 0) {
          gsap.from(heroSteps, {
            y: 12,
            autoAlpha: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.07,
            clearProps: 'transform,opacity,visibility',
          })
        }
      }

      // ── Steps reveal on scroll ── only when motion is allowed.
      if (!prefersReduced) {
        const stepItems = gsap.utils.toArray<HTMLElement>(
          '[data-motion="steps"] [data-motion-item]'
        )
        stepItems.forEach((el, i) => {
          gsap.from(el, {
            y: 16,
            autoAlpha: 0,
            duration: 0.5,
            ease: 'power2.out',
            delay: i * 0.06,
            clearProps: 'transform,opacity,visibility',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
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
