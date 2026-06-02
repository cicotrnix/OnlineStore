/**
 * Cliente FedEx. Producción: HTTP fetch a la API REST con OAuth client_credentials;
 * dev/test/CI: Fake in-memory.
 *
 * Env vars (todas requeridas para activar el real):
 *   - FEDEX_API_KEY (client_id)
 *   - FEDEX_API_SECRET (client_secret) [usar FEDEX_API_KEY como password si no hay separación]
 *   - FEDEX_ACCOUNT_NUMBER
 *   - FEDEX_METER_NUMBER (algunos endpoints lo requieren)
 *   - FEDEX_FROM_ZIP (origen por default; quoteShipment lo provee igual)
 *   - FEDEX_BASE_URL (opcional, default https://apis.fedex.com)
 *
 * Sin las 4 → FakeFedex (deploy inerte).
 *
 * Restricción: solo Ground (hazmat clase 9 litio prohíbe Air).
 */

import { logger } from '@/lib/observability/logger'

export interface RateRequest {
  fromZip: string
  toZip: string
  weightLbs: number
  hazmat?: boolean
}

export interface RateQuote {
  service: 'FEDEX_GROUND' | 'FEDEX_HOME_DELIVERY'
  amountCents: bigint
  currency: 'USD'
  transitDays: number
}

export interface LabelRequest {
  service: 'FEDEX_GROUND' | 'FEDEX_HOME_DELIVERY'
  fromAddress: Address
  toAddress: Address
  weightLbs: number
  shipmentId: string // idempotency key
  hazmat?: boolean
}

export interface Address {
  recipient: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string // 2-letter
}

export interface Label {
  trackingNumber: string
  labelUrl: string
}

export interface FedexClient {
  rate(req: RateRequest): Promise<RateQuote[]>
  buyLabel(req: LabelRequest): Promise<Label>
}

// ─── Fake ─────────────────────────────────────────────────────────────────

class FakeFedex implements FedexClient {
  private labels = new Map<string, Label>()

  async rate(req: RateRequest): Promise<RateQuote[]> {
    if (req.weightLbs <= 0) throw new Error('weight must be > 0')
    const baseCents = 1200n
    const perLbCents = BigInt(Math.ceil(req.weightLbs * 50))
    const total = baseCents + perLbCents
    return [
      { service: 'FEDEX_GROUND', amountCents: total, currency: 'USD', transitDays: 4 },
    ]
  }

  async buyLabel(req: LabelRequest): Promise<Label> {
    if (req.toAddress.country !== 'US') {
      throw new Error('FedEx domestic only — use Miami forwarder for export')
    }
    const cached = this.labels.get(req.shipmentId)
    if (cached) return cached
    const label: Label = {
      trackingNumber: `FX${Date.now()}${Math.floor(Math.random() * 1000)}`,
      labelUrl: `https://fake-fedex.example/label/${req.shipmentId}.pdf`,
    }
    this.labels.set(req.shipmentId, label)
    return label
  }

  _reset() {
    this.labels.clear()
  }
}

// ─── Real ─────────────────────────────────────────────────────────────────

interface FedexConfig {
  apiKey: string
  apiSecret: string
  accountNumber: string
  meterNumber?: string
  baseUrl: string
}

class RealFedex implements FedexClient {
  private accessToken: string | null = null
  private tokenExpiresAt = 0

  constructor(private readonly cfg: FedexConfig) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.accessToken
    }
    const res = await fetch(`${this.cfg.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.cfg.apiKey,
        client_secret: this.cfg.apiSecret,
      }),
    })
    if (!res.ok) throw new Error(`FedEx OAuth failed: ${res.status}`)
    const json = (await res.json()) as { access_token: string; expires_in: number }
    this.accessToken = json.access_token
    this.tokenExpiresAt = Date.now() + json.expires_in * 1000
    return this.accessToken
  }

  async rate(req: RateRequest): Promise<RateQuote[]> {
    if (req.weightLbs <= 0) throw new Error('weight must be > 0')
    const token = await this.getToken()
    const res = await fetch(`${this.cfg.baseUrl}/rate/v1/rates/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountNumber: { value: this.cfg.accountNumber },
        requestedShipment: {
          shipper: { address: { postalCode: req.fromZip, countryCode: 'US' } },
          recipient: { address: { postalCode: req.toZip, countryCode: 'US' } },
          pickupType: 'USE_SCHEDULED_PICKUP',
          // Ground-only enforced (hazmat clase 9 litio).
          serviceType: 'FEDEX_GROUND',
          requestedPackageLineItems: [
            {
              weight: { units: 'LB', value: req.weightLbs },
              // Si hazmat, la API requiere specialServicesRequested.
              ...(req.hazmat
                ? {
                    specialServicesRequested: {
                      specialServiceTypes: ['DANGEROUS_GOODS'],
                    },
                  }
                : {}),
            },
          ],
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.error({ status: res.status, body: text.slice(0, 500) }, 'fedex rate failed')
      throw new Error(`FedEx rate failed: ${res.status}`)
    }
    const json = (await res.json()) as {
      output?: {
        rateReplyDetails?: Array<{
          serviceType?: string
          ratedShipmentDetails?: Array<{
            totalNetCharge?: number
            currency?: string
          }>
          commit?: { dateDetail?: { dayCxsFormat?: string }; transitTime?: string }
        }>
      }
    }
    const quotes: RateQuote[] = []
    for (const r of json.output?.rateReplyDetails ?? []) {
      if (r.serviceType !== 'FEDEX_GROUND') continue
      const detail = r.ratedShipmentDetails?.[0]
      if (!detail?.totalNetCharge) continue
      quotes.push({
        service: 'FEDEX_GROUND',
        amountCents: BigInt(Math.round(detail.totalNetCharge * 100)),
        currency: 'USD',
        transitDays: 4,
      })
    }
    return quotes
  }

  async buyLabel(req: LabelRequest): Promise<Label> {
    if (req.toAddress.country !== 'US') {
      throw new Error('FedEx domestic only — use Miami forwarder for export')
    }
    const token = await this.getToken()
    const res = await fetch(`${this.cfg.baseUrl}/ship/v1/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // Idempotencia: FedEx soporta x-customer-transaction-id.
        'x-customer-transaction-id': req.shipmentId,
      },
      body: JSON.stringify({
        labelResponseOptions: 'URL_ONLY',
        accountNumber: { value: this.cfg.accountNumber },
        requestedShipment: {
          shipper: {
            contact: { personName: req.fromAddress.recipient },
            address: {
              streetLines: [req.fromAddress.line1, req.fromAddress.line2].filter(Boolean),
              city: req.fromAddress.city,
              stateOrProvinceCode: req.fromAddress.state,
              postalCode: req.fromAddress.postalCode,
              countryCode: req.fromAddress.country,
            },
          },
          recipients: [
            {
              contact: { personName: req.toAddress.recipient },
              address: {
                streetLines: [req.toAddress.line1, req.toAddress.line2].filter(Boolean),
                city: req.toAddress.city,
                stateOrProvinceCode: req.toAddress.state,
                postalCode: req.toAddress.postalCode,
                countryCode: req.toAddress.country,
              },
            },
          ],
          serviceType: 'FEDEX_GROUND',
          packagingType: 'YOUR_PACKAGING',
          pickupType: 'USE_SCHEDULED_PICKUP',
          requestedPackageLineItems: [
            {
              weight: { units: 'LB', value: req.weightLbs },
              ...(req.hazmat
                ? {
                    specialServicesRequested: {
                      specialServiceTypes: ['DANGEROUS_GOODS'],
                    },
                  }
                : {}),
            },
          ],
          labelSpecification: { labelFormatType: 'COMMON2D', imageType: 'PDF' },
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.error({ status: res.status, body: text.slice(0, 500) }, 'fedex label failed')
      throw new Error(`FedEx label failed: ${res.status}`)
    }
    const json = (await res.json()) as {
      output?: {
        transactionShipments?: Array<{
          masterTrackingNumber?: string
          pieceResponses?: Array<{
            trackingNumber?: string
            packageDocuments?: Array<{ url?: string }>
          }>
        }>
      }
    }
    const ts = json.output?.transactionShipments?.[0]
    const trackingNumber =
      ts?.masterTrackingNumber ?? ts?.pieceResponses?.[0]?.trackingNumber ?? ''
    const labelUrl = ts?.pieceResponses?.[0]?.packageDocuments?.[0]?.url ?? ''
    if (!trackingNumber || !labelUrl) {
      throw new Error('FedEx label response missing tracking or url')
    }
    return { trackingNumber, labelUrl }
  }
}

// ─── Selector ─────────────────────────────────────────────────────────────

let cached: FedexClient | null = null
let fakeInstance: FakeFedex | null = null

export function getFedexClient(): FedexClient {
  if (cached) return cached
  const apiKey = process.env.FEDEX_API_KEY
  const apiSecret = process.env.FEDEX_API_SECRET ?? apiKey // soporta single-secret
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER
  if (apiKey && apiSecret && accountNumber) {
    cached = new RealFedex({
      apiKey,
      apiSecret,
      accountNumber,
      meterNumber: process.env.FEDEX_METER_NUMBER,
      baseUrl: process.env.FEDEX_BASE_URL ?? 'https://apis.fedex.com',
    })
  } else {
    if (!fakeInstance) fakeInstance = new FakeFedex()
    cached = fakeInstance
  }
  return cached
}

export function _resetFedex(): void {
  if (fakeInstance) fakeInstance._reset()
  cached = null
}

export function _getFakeFedex(): FakeFedex {
  if (!fakeInstance) fakeInstance = new FakeFedex()
  return fakeInstance
}

/** Solo para tests. */
export function _setFedexClient(client: FedexClient | null): void {
  cached = client
}
