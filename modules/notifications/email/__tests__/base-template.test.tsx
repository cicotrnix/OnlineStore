import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrderPlacedEmail } from '../templates'
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
    // El CTA es el único <a> del template (el logo es <img>, el footer es texto).
    // Sin link → sin ancla. (No se chequea el dominio: el logo de marca lo usa.)
    expect(html).not.toContain('<a')
  })
})

describe('OrderPlacedEmail — CTA "Volver a pedir" secundario', () => {
  it('incluye el CTA secundario que linkea al detalle del pedido (no ejecuta la acción)', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://pipower.shop')
    const html = renderToStaticMarkup(
      OrderPlacedEmail({
        title: 'Order received',
        body: 'b',
        link: '/orders/abc',
        userName: 'Buyer',
        locale: 'en-US',
      })
    )
    expect(html).toContain('Reorder')
    expect(html).toContain('View order')
    // ambos CTAs llevan al detalle del pedido (donde está el botón in-app)
    expect(html).toContain('https://pipower.shop/orders/abc')
  })

  it('localiza el CTA secundario en ES', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://pipower.shop')
    const html = renderToStaticMarkup(
      OrderPlacedEmail({
        title: 't',
        body: 'b',
        link: '/orders/abc',
        userName: 'Buyer',
        locale: 'es-419',
      })
    )
    expect(html).toContain('Volver a pedir')
  })
})
