import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retryFailedEmails } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id-mock' }),
}))

beforeEach(cleanDb)

describe('notifications.retryFailedEmails', () => {
  it('retries emails with emailSentAt null and retryCount < 5', async () => {
    const u = await prisma.user.create({ data: { email: 'r1@test.com', name: 'R1' } })
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: 'QUOTE_SUBMITTED',
        title: 't',
        body: 'b',
        emailSentAt: null,
        emailRetryCount: 2,
        emailFailedReason: 'previous error',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    })

    const result = await retryFailedEmails()

    expect(result.attempted).toBeGreaterThanOrEqual(1)
    const updated = await prisma.notification.findFirst({ where: { userId: u.id } })
    expect(updated?.emailSentAt).not.toBeNull()
  })

  it('skips emails with retryCount >= 5', async () => {
    const u = await prisma.user.create({ data: { email: 'r2@test.com', name: 'R2' } })
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: 'QUOTE_QUOTED',
        title: 't',
        body: 'b',
        emailSentAt: null,
        emailRetryCount: 5,
        emailFailedReason: 'permanent',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    })

    const result = await retryFailedEmails()
    expect(result.attempted).toBe(0)
  })

  it('skips emails newer than retry delay window', async () => {
    const u = await prisma.user.create({ data: { email: 'r3@test.com', name: 'R3' } })
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: 'INVOICE_DUE_SOON',
        title: 't',
        body: 'b',
        emailSentAt: null,
        emailRetryCount: 0,
        createdAt: new Date(),
      },
    })

    const result = await retryFailedEmails()
    expect(result.attempted).toBe(0)
  })
})
