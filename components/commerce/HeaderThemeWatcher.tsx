'use client'

import { useEffect } from 'react'

const HEADER_HEIGHT = 80 // h-20

/**
 * HeaderThemeWatcher — companion to Header. Listens to scroll and flips the
 * `data-header-theme` attribute on the `<header>` element so the CSS rules
 * driven by Tailwind's `data-[...]:` / `group-data-[...]:` variants take over.
 *
 * Why DOM, not React state: keeps Header a server component (so SignOutButton
 * and i18n helpers that touch next/headers stay on the server) and avoids
 * re-rendering the header on every scroll frame.
 *
 * Reduced motion is honoured at the CSS layer (transition durations are 0 via
 * `motion-reduce:duration-0`), so swaps happen instantly when the user opts
 * out of motion.
 */
export function HeaderThemeWatcher(): null {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-header-theme]:not(header)')
    )
    const header = document.querySelector<HTMLElement>('header[data-header-theme]')
    if (!header || sections.length === 0) return

    let ticking = false
    function update() {
      ticking = false
      if (!header) return
      let active: 'dark' | 'light' | null = null
      for (const s of sections) {
        const rect = s.getBoundingClientRect()
        if (rect.top - HEADER_HEIGHT <= 0 && rect.bottom > HEADER_HEIGHT) {
          const t = s.dataset.headerTheme
          if (t === 'dark' || t === 'light') active = t
        }
      }
      if (active && header.dataset.headerTheme !== active) {
        header.dataset.headerTheme = active
      }
    }
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update() // align with current scroll position on mount
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
