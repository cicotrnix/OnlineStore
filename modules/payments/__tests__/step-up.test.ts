import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { consumeSensitiveActionToken, issueSensitiveActionToken } from '../step-up'

beforeEach(async () => {
  await cleanDb()
})

async function user() {
  return prisma.user.create({ data: { email: `su-${Date.now()}@t.com` } })
}

describe('sensitive action step-up', () => {
  it('issue + consume válido marca USED', async () => {
    const u = await user()
    const { token, otp } = await issueSensitiveActionToken({
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    const ok = await consumeSensitiveActionToken({
      token,
      otp,
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    expect(ok).toBe(true)
  })

  it('OTP incorrecto = false', async () => {
    const u = await user()
    const { token } = await issueSensitiveActionToken({
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    const ok = await consumeSensitiveActionToken({
      token,
      otp: '000000',
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    expect(ok).toBe(false)
  })

  it('subject diferente = false', async () => {
    const u = await user()
    const { token, otp } = await issueSensitiveActionToken({
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    const ok = await consumeSensitiveActionToken({
      token,
      otp,
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p2',
    })
    expect(ok).toBe(false)
  })

  it('token consumido no se reutiliza', async () => {
    const u = await user()
    const { token, otp } = await issueSensitiveActionToken({
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    await consumeSensitiveActionToken({
      token,
      otp,
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    const ok = await consumeSensitiveActionToken({
      token,
      otp,
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    expect(ok).toBe(false)
  })
})
