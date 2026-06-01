/**
 * Cliente FedEx (Fake in-memory para tests / noop sin claves).
 * Restringe a Ground-only para hazmat clase 9 (litio).
 */

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

class FakeFedex implements FedexClient {
  private labels = new Map<string, Label>() // shipmentId → label (idempotency)

  async rate(req: RateRequest): Promise<RateQuote[]> {
    // Solo USA doméstico, solo Ground. Fake pricing: base + 0.5 USD/lb.
    if (req.weightLbs <= 0) throw new Error('weight must be > 0')
    const baseCents = 1200n // $12 base
    const perLbCents = BigInt(Math.ceil(req.weightLbs * 50))
    const total = baseCents + perLbCents
    return [
      {
        service: 'FEDEX_GROUND',
        amountCents: total,
        currency: 'USD',
        transitDays: 4,
      },
    ]
  }

  async buyLabel(req: LabelRequest): Promise<Label> {
    if (req.toAddress.country !== 'US') {
      throw new Error('FedEx domestic only — use Miami forwarder for export')
    }
    // Idempotente por shipmentId.
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

let fakeInstance: FakeFedex | null = null

export function getFedexClient(): FedexClient {
  // Producción: detectar FEDEX_API_KEY → instanciar adaptador real.
  if (!fakeInstance) fakeInstance = new FakeFedex()
  return fakeInstance
}

export function _resetFedex(): void {
  if (fakeInstance) fakeInstance._reset()
}

export function _getFakeFedex(): FakeFedex {
  return getFedexClient() as FakeFedex
}
