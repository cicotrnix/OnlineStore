import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BaseTemplate } from '../templates/_base'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('BaseTemplate — CTA href', () => {
  it('CTA href es absoluto cuando NEXT_PUBLIC_APP_URL no está y NEXTAUTH_URL sí', () => {
    // Reproduce el caso prod: NEXT_PUBLIC_APP_URL no está seteada,
    // NEXTAUTH_URL seteada a https://pipower.shop. Sin el fallback, el
    // CTA queda con href relativo /invoices/abc y los botones no navegan.
    // vi.stubEnv con undefined fuerza el read a undefined (Node stringifica
    // asignaciones plain a process.env, así que stubEnv es el camino correcto).
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined as unknown as string)
    vi.stubEnv('NEXTAUTH_URL', 'https://pipower.shop')
    const html = renderToStaticMarkup(
      BaseTemplate({
        title: 'Invoice issued',
        body: 'Your invoice is ready.',
        link: '/invoices/abc',
        userName: 'Buyer',
      })
    )
    expect(html).toContain('https://pipower.shop/invoices/abc')
    expect(html).not.toMatch(/href="\/invoices\/abc"/)
  })

  it('NEXT_PUBLIC_APP_URL gana sobre NEXTAUTH_URL si ambas están', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://staging.pipower.shop')
    vi.stubEnv('NEXTAUTH_URL', 'https://pipower.shop')
    const html = renderToStaticMarkup(
      BaseTemplate({
        title: 'Invoice issued',
        body: 'b',
        link: '/invoices/abc',
        userName: 'Buyer',
      })
    )
    expect(html).toContain('https://staging.pipower.shop/invoices/abc')
    expect(html).not.toContain('https://pipower.shop/invoices/abc')
  })

  it('sin link no renderiza CTA', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://pipower.shop')
    const html = renderToStaticMarkup(BaseTemplate({ title: 't', body: 'b', userName: 'Buyer' }))
    expect(html).not.toContain('https://pipower.shop')
  })
})
