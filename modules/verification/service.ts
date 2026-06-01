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
 * Carga del certificado de reventa o equivalente extranjero.
 * Auto-aprueba: marca la org como VERIFIED + taxExempt y emite
 * `customer.verified` en la misma transacción (transactional outbox).
 */
export async function uploadAndAutoApprove(input: UploadTaxDocInput): Promise<void> {
  const storage = getStorage()
  const fileKey = `tax-docs/${input.organizationId}/${Date.now()}-${input.fileName}`
  await storage.put(fileKey, input.fileBytes)

  await prisma.$transaction(async (tx) => {
    const doc = await tx.taxDocument.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        number: input.number,
        jurisdiction: input.jurisdiction,
        fileKey,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    })
    const org = await tx.organization.update({
      where: { id: input.organizationId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        taxExempt: true,
        country: input.country ?? undefined,
      },
    })
    await emitEvent(tx, {
      type: 'customer.verified',
      aggregateType: 'Organization',
      aggregateId: org.id,
      payload: {
        organizationId: org.id,
        taxDocumentId: doc.id,
        type: doc.type,
        country: org.country,
        verifiedAt: org.verifiedAt?.toISOString(),
      },
    })
  })
}

export async function isVerified(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { verificationStatus: true },
  })
  return org?.verificationStatus === 'VERIFIED'
}
