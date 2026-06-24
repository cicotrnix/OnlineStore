import { prisma } from '@/lib/db/client'
import { getStorage } from '@/lib/storage'
import { emitEvent } from '@/modules/events'
import type { TaxDocumentType } from '@prisma/client'

export interface UploadTaxDocInput {
  organizationId: string
  type: TaxDocumentType
  number: string
  jurisdiction: string
  fileName: string
  fileBytes: Uint8Array
  country?: string
}

/**
 * Sube el certificado a R2 + crea TaxDocument UPLOADED + marca la org como
 * PENDING revisión. **No auto-aprueba** — esto lo hace el admin con
 * approveOrganization (Onboarding B2B 2026-06-02).
 */
export async function uploadCertificate(input: UploadTaxDocInput): Promise<void> {
  const storage = getStorage()
  const fileKey = `tax-docs/${input.organizationId}/${Date.now()}-${input.fileName}`
  await storage.put(fileKey, input.fileBytes)

  await prisma.$transaction(async (tx) => {
    await tx.taxDocument.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        number: input.number,
        jurisdiction: input.jurisdiction,
        fileKey,
        status: 'UPLOADED',
      },
    })
    await tx.organization.update({
      where: { id: input.organizationId },
      data: {
        // Si la org venía rechazada, vuelve a PENDING — el admin re-evalúa.
        verificationStatus: 'PENDING',
        verificationSubmittedAt: new Date(),
        rejectionReason: null,
        country: input.country ?? undefined,
      },
    })
  })
}

/**
 * Aprobación manual del admin (Onboarding B2B 2026-06-02). Marca VERIFIED +
 * taxExempt y emite customer.verified.
 *
 * Idempotente: si la org ya está VERIFIED, no actualiza ni emite eventos.
 * Evita doble-emisión cuando el admin clickea repetidas veces el botón.
 */
export async function approveOrganization(input: {
  organizationId: string
  byAdminId: string
}): Promise<{ changed: boolean }> {
  return prisma.$transaction(async (tx) => {
    // Row lock para evitar race entre dos admins clickeando en paralelo.
    await tx.$executeRawUnsafe(
      `SELECT id FROM "Organization" WHERE id = $1 FOR UPDATE`,
      input.organizationId
    )
    const current = await tx.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: { verificationStatus: true },
    })
    if (current.verificationStatus === 'VERIFIED') {
      return { changed: false }
    }

    const org = await tx.organization.update({
      where: { id: input.organizationId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        taxExempt: true,
        rejectionReason: null,
      },
    })
    // Marca los TaxDocument UPLOADED como APPROVED.
    await tx.taxDocument.updateMany({
      where: { organizationId: org.id, status: 'UPLOADED' },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: input.byAdminId },
    })
    await emitEvent(tx, {
      type: 'customer.verified',
      aggregateType: 'Organization',
      aggregateId: org.id,
      payload: {
        organizationId: org.id,
        country: org.country,
        verifiedAt: org.verifiedAt?.toISOString(),
        byAdminId: input.byAdminId,
      },
    })
    return { changed: true }
  })
}

/**
 * Rechazo manual del admin con motivo. Marca REJECTED + emite
 * customer.rejected. El usuario puede re-subir el certificado para volver a
 * PENDING (uploadCertificate limpia rejectionReason).
 *
 * Idempotente: si la org ya está REJECTED con el mismo motivo, no actualiza
 * ni emite. Si está REJECTED con otro motivo, actualiza el motivo y re-emite
 * (el motivo nuevo amerita notificación).
 */
export async function rejectOrganization(input: {
  organizationId: string
  byAdminId: string
  reason: string
}): Promise<{ changed: boolean }> {
  const reason = input.reason.trim()
  if (!reason) throw new Error('reason is required for rejection')
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT id FROM "Organization" WHERE id = $1 FOR UPDATE`,
      input.organizationId
    )
    const current = await tx.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: { verificationStatus: true, rejectionReason: true },
    })
    if (current.verificationStatus === 'REJECTED' && current.rejectionReason === reason) {
      return { changed: false }
    }

    const org = await tx.organization.update({
      where: { id: input.organizationId },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: reason,
      },
    })
    await tx.taxDocument.updateMany({
      where: { organizationId: org.id, status: 'UPLOADED' },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: input.byAdminId },
    })
    await emitEvent(tx, {
      type: 'customer.rejected',
      aggregateType: 'Organization',
      aggregateId: org.id,
      payload: {
        organizationId: org.id,
        reason,
        byAdminId: input.byAdminId,
      },
    })
    return { changed: true }
  })
}

/**
 * Atajo admin-only: subir + aprobar en una pasada (compat con flujo
 * pre-onboarding). Usado por la UI admin existente al cargar cert + aprobar
 * en el mismo paso.
 */
export async function uploadAndAutoApprove(
  input: UploadTaxDocInput & { byAdminId?: string }
): Promise<void> {
  await uploadCertificate(input)
  await approveOrganization({
    organizationId: input.organizationId,
    byAdminId: input.byAdminId ?? 'admin-self-upload',
  })
}

/**
 * Onboarding LATAM: el cliente declara su tax ID de negocio; la prueba de
 * existencia (screenshot del registro oficial) la sube el admin al aprobar.
 * No crea TaxDocument ni exige archivo del cliente.
 */
export async function submitBusinessForVerification(input: {
  organizationId: string
  taxId: string
  taxIdCountry: string
}): Promise<void> {
  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      taxId: input.taxId,
      taxIdCountry: input.taxIdCountry,
      verificationStatus: 'PENDING',
      verificationSubmittedAt: new Date(),
      rejectionReason: null,
      country: input.taxIdCountry,
    },
  })
}

export async function isVerified(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { verificationStatus: true },
  })
  return org?.verificationStatus === 'VERIFIED'
}
