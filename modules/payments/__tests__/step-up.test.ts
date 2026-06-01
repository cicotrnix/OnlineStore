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

  it('5 OTP incorrectos → token BLOCKED y no acepta el OTP válido luego', async () => {
    const { prisma } = await import('@/lib/db/client')
    const u = await user()
    const { token, otp } = await issueSensitiveActionToken({
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    for (let i = 0; i < 5; i++) {
      const ok = await consumeSensitiveActionToken({
        token,
        otp: '000000',
        userId: u.id,
        action: 'payment.refund',
        subjectId: 'p1',
      })
      expect(ok).toBe(false)
    }
    const row = await prisma.sensitiveActionToken.findFirstOrThrow({ where: { userId: u.id } })
    expect(row.status).toBe('BLOCKED')
    expect(row.otpAttempts).toBe(5)
    // OTP correcto post-bloqueo no funciona.
    const finalOk = await consumeSensitiveActionToken({
      token,
      otp,
      userId: u.id,
      action: 'payment.refund',
      subjectId: 'p1',
    })
    expect(finalOk).toBe(false)
  })
})
