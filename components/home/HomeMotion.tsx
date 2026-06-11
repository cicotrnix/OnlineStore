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
    if (prefersReduced) return

    const ctx = gsap.context(() => {
      const heroSteps = gsap.utils.toArray<HTMLElement>('[data-motion="hero"] [data-motion-step]')
      if (heroSteps.length > 0) {
        gsap.from(heroSteps, {
          y: 12,
          autoAlpha: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.06,
          clearProps: 'transform,opacity,visibility',
        })
      }

      const stepItems = gsap.utils.toArray<HTMLElement>('[data-motion="steps"] [data-motion-item]')
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
    })

    return () => {
      ctx.revert()
    }
  }, [])

  return null
}
