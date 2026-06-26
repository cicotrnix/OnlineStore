/**
 * Render del recibo consolidado (PAYMENT_CAPTURED) + chrome de marca nuevo.
 */
import { renderEmailFor } from '@/modules/notifications/email'
import { describe, expect, it } from 'vitest'

describe('PAYMENT_CAPTURED consolidado — recibo + marca', () => {
  it('renderiza bloque recibo (factura, total, "Pagado", método) + logo + disclaimer', async () => {
    const html = await renderEmailFor(
      'PAYMENT_CAPTURED',
      {
        title: '¡Gracias por tu compra! — Orden ORD-2026-000010',
        body: 'Recibimos tu pago. Tu orden ORD-2026-000010 está confirmada y en preparación.',
        link: '/orders/abc',
        userName: 'Buyer',
        receipt: {
          invoiceNumber: 'IN-2026-000010',
          dateFormatted: '2026-06-25',
          method: 'Tarjeta',
          totalFormatted: '$50.00',
        },
      },
      'es-419'
    )
    expect(html).toContain('IN-2026-000010')
    expect(html).toContain('$50.00')
    expect(html).toContain('Pagado')
    expect(html).toContain('Tarjeta')
    expect(html).toContain('¡Gracias por tu compra!')
    expect(html).toContain('logo-pipower-light.png') // chrome de marca (todos los emails)
    expect(html).toContain('Apple Inc.') // disclaimer aftermarket en el footer
  })

  it('sin receipt: render OK y sin pill "Pagado"', async () => {
    const html = await renderEmailFor(
      'ORDER_PLACED',
      { title: 'Orden recibida', body: 'Recibimos tu orden.', userName: 'U' },
      'en-US'
    )
    expect(html.length).toBeGreaterThan(0)
    expect(html).not.toContain('Pagado')
    expect(html).toContain('logo-pipower-light.png') // el chrome lo ganan todos
  })
})
