import { prisma } from '@/lib/db/client'
import { type FedexClient, getFedexClient } from '@/lib/fedex'
import { emitEvent } from '@/modules/events'

/**
 * Límites hazmat litio (config dominio-como-datos; valores a fijar con ops).
 * Por paquete: máx cantidad de celdas + máx watt-hours totales.
 */
export const HAZMAT_LIMITS = {
  maxCells: 100,
  maxWattHours: 300,
} as const

export interface QuoteShipmentInput {
  orderId: string
  fromZip: string
  weightLbs: number
  hazmat?: boolean
  hazmatCells?: number
  hazmatWattHours?: number
}

/**
 * Cotiza un envío para una orden. Restringe a Ground; valida hazmat limits.
 * El destino se deriva de la dirección de envío de la orden.
 * - Si el país de la dirección es US: cotiza con FedEx Ground.
 * - Si no es US: marca isExport=true y NO cotiza con FedEx; usa Miami forwarder.
 */
export async function quoteShipment(
  input: QuoteShipmentInput,
  client: FedexClient = getFedexClient()
): Promise<{ shipmentId: string; rateCents: bigint | null; isExport: boolean }> {
  if (input.hazmat) {
    if (input.hazmatCells != null && input.hazmatCells > HAZMAT_LIMITS.maxCells) {
      throw new Error(
        `HAZMAT_LIMIT_CELLS exceeded: ${input.hazmatCells} > ${HAZMAT_LIMITS.maxCells}`
      )
    }
    if (input.hazmatWattHours != null && input.hazmatWattHours > HAZMAT_LIMITS.maxWattHours) {
      throw new Error(
        `HAZMAT_LIMIT_WH exceeded: ${input.hazmatWattHours} > ${HAZMAT_LIMITS.maxWattHours}`
      )
    }
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { shippingAddress: true },
  })
  const toCountry = order.shippingAddress.country
  const isExport = toCountry !== 'US'

  // Upsert Shipment (un Shipment por order, unique).
  const existing = await prisma.shipment.findUnique({ where: { orderId: order.id } })
  if (existing && existing.status !== 'PENDING' && existing.status !== 'RATE_QUOTED') {
    return {
      shipmentId: existing.id,
      rateCents: existing.rateCents,
      isExport: existing.isExport,
    }
  }

  if (isExport) {
    // Export: no FedEx int'l; el cliente provee forwarder Miami; cotizamos despacho
    // doméstico a Miami con el forwarder address (a setear desde admin). Aquí solo
    // marcamos como export y no auto-cotizamos.
    const shipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        isExport: true,
        hazmat: input.hazmat ?? false,
        hazmatCells: input.hazmatCells,
        hazmatWattHours: input.hazmatWattHours,
        status: 'PENDING',
        notes: 'EXPORT — uses Miami forwarder; manual dispatch required',
      },
      update: { isExport: true, status: 'PENDING' },
    })
    return { shipmentId: shipment.id, rateCents: null, isExport: true }
  }

  const rates = await client.rate({
    fromZip: input.fromZip,
    toZip: order.shippingAddress.postalCode,
    weightLbs: input.weightLbs,
    hazmat: input.hazmat,
  })
  const ground = rates.find((r) => r.service === 'FEDEX_GROUND')
  if (!ground) throw new Error('No FedEx Ground rate available (hazmat ground-only required)')

  const shipment = await prisma.shipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      carrier: 'FEDEX',
      service: ground.service,
      status: 'RATE_QUOTED',
      isExport: false,
      hazmat: input.hazmat ?? false,
      hazmatCells: input.hazmatCells,
      hazmatWattHours: input.hazmatWattHours,
      rateCents: ground.amountCents,
      rateCurrency: ground.currency,
      rateQuotedAt: new Date(),
    },
    update: {
      service: ground.service,
      status: 'RATE_QUOTED',
      rateCents: ground.amountCents,
      rateQuotedAt: new Date(),
    },
  })
  return { shipmentId: shipment.id, rateCents: ground.amountCents, isExport: false }
}

/**
 * Compra etiqueta + marca dispatched + emite shipment.dispatched.
 * Idempotente: si ya hay tracking, no vuelve a cobrar al cliente FedEx.
 */
export async function dispatchShipment(
  input: { shipmentId: string; fromAddress: import('@/lib/fedex').Address; weightLbs: number },
  client: FedexClient = getFedexClient()
): Promise<{ trackingNumber: string }> {
  const sh = await prisma.shipment.findUniqueOrThrow({
    where: { id: input.shipmentId },
    include: { order: { include: { shippingAddress: true } } },
  })
  if (sh.isExport) throw new Error('EXPORT_SHIPMENT — dispatch handled by Miami forwarder')
  if (sh.trackingNumber) {
    return { trackingNumber: sh.trackingNumber }
  }
  const toAddr = sh.order.shippingAddress
  const label = await client.buyLabel({
    service: sh.service,
    fromAddress: input.fromAddress,
    toAddress: {
      recipient: toAddr.recipient,
      line1: toAddr.line1,
      line2: toAddr.line2 ?? undefined,
      city: toAddr.city,
      state: toAddr.state ?? '',
      postalCode: toAddr.postalCode,
      country: toAddr.country,
    },
    weightLbs: input.weightLbs,
    shipmentId: sh.id,
    hazmat: sh.hazmat,
  })
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: sh.id },
      data: {
        trackingNumber: label.trackingNumber,
        labelUrl: label.labelUrl,
        labelPurchasedAt: new Date(),
        dispatchedAt: new Date(),
        status: 'DISPATCHED',
      },
    })
    await tx.order.update({
      where: { id: sh.orderId },
      data: { shippedAt: new Date() },
    })
    await emitEvent(tx, {
      type: 'shipment.dispatched',
      aggregateType: 'Shipment',
      aggregateId: sh.id,
      payload: {
        orderId: sh.orderId,
        trackingNumber: label.trackingNumber,
        carrier: sh.carrier,
        service: sh.service,
      },
    })
  })
  return { trackingNumber: label.trackingNumber }
}
