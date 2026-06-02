import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIG = { ...process.env }
const fetchMock = vi.fn()
const realFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  vi.resetModules()
  for (const k of [
    'FEDEX_API_KEY',
    'FEDEX_API_SECRET',
    'FEDEX_ACCOUNT_NUMBER',
    'FEDEX_METER_NUMBER',
    'FEDEX_FROM_ZIP',
    'FEDEX_BASE_URL',
  ]) {
    delete process.env[k]
  }
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  process.env = { ...ORIG }
  globalThis.fetch = realFetch
})

describe('lib/fedex — adapter selection', () => {
  it('sin env vars → FakeFedex (noop-safe)', async () => {
    const { getFedexClient, _getFakeFedex } = await import('../index')
    const c = getFedexClient()
    expect(c).toBe(_getFakeFedex())
    const rates = await c.rate({ fromZip: '33101', toZip: '78701', weightLbs: 5 })
    expect(rates[0]?.service).toBe('FEDEX_GROUND')
  })

  it('con 3 env vars (key+secret+account) → RealFedex; OAuth + rate POST', async () => {
    process.env.FEDEX_API_KEY = 'k'
    process.env.FEDEX_API_SECRET = 's'
    process.env.FEDEX_ACCOUNT_NUMBER = '999'

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok123', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            rateReplyDetails: [
              {
                serviceType: 'FEDEX_GROUND',
                ratedShipmentDetails: [{ totalNetCharge: 12.5, currency: 'USD' }],
              },
            ],
          },
        }),
      })

    const { getFedexClient } = await import('../index')
    const quotes = await getFedexClient().rate({
      fromZip: '33101',
      toZip: '78701',
      weightLbs: 10,
    })
    expect(quotes).toHaveLength(1)
    expect(quotes[0]!.amountCents).toBe(1250n)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/oauth\/token$/)
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/rate\/v1\/rates\/quotes$/)
    const rateOpts = fetchMock.mock.calls[1]![1]! as RequestInit
    expect(rateOpts.headers).toMatchObject({ Authorization: 'Bearer tok123' })
  })

  it('RealFedex.buyLabel: rechaza export y pasa idempotency header', async () => {
    process.env.FEDEX_API_KEY = 'k'
    process.env.FEDEX_API_SECRET = 's'
    process.env.FEDEX_ACCOUNT_NUMBER = '999'

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            transactionShipments: [
              {
                masterTrackingNumber: 'FX999',
                pieceResponses: [
                  {
                    trackingNumber: 'FX999',
                    packageDocuments: [{ url: 'https://l.example/x.pdf' }],
                  },
                ],
              },
            ],
          },
        }),
      })

    const { getFedexClient } = await import('../index')
    const addr = {
      recipient: 'X',
      line1: '1 A',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
    }
    const { trackingNumber, labelUrl } = await getFedexClient().buyLabel({
      service: 'FEDEX_GROUND',
      fromAddress: addr,
      toAddress: addr,
      weightLbs: 5,
      shipmentId: 'ship-1',
    })
    expect(trackingNumber).toBe('FX999')
    expect(labelUrl).toBe('https://l.example/x.pdf')
    const labelOpts = fetchMock.mock.calls[1]![1]! as RequestInit
    expect((labelOpts.headers as Record<string, string>)['x-customer-transaction-id']).toBe(
      'ship-1'
    )

    // Export rechazado.
    await expect(
      getFedexClient().buyLabel({
        service: 'FEDEX_GROUND',
        fromAddress: addr,
        toAddress: { ...addr, country: 'MX' },
        weightLbs: 5,
        shipmentId: 'ship-2',
      })
    ).rejects.toThrow(/domestic only/i)
  })

  it('falta sólo FEDEX_ACCOUNT_NUMBER → FakeFedex', async () => {
    process.env.FEDEX_API_KEY = 'k'
    process.env.FEDEX_API_SECRET = 's'
    const { getFedexClient, _getFakeFedex } = await import('../index')
    expect(getFedexClient()).toBe(_getFakeFedex())
  })
})
