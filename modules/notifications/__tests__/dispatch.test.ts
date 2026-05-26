import { prisma } from '@/lib/db/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatch } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id-mock' }),
}))

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
})

describe('notifications.dispatch', () => {
  it('creates Notification rows for each userId', async () => {
    const [u1, u2] = await Promise.all([
      prisma.user.create({ data: { email: 'd1@test.com', name: 'A' } }),
      prisma.user.create({ data: { email: 'd2@test.com', name: 'B' } }),
    ])

    await dispatch({
      userIds: [u1.id, u2.id],
      type: 'QUOTE_SUBMITTED',
      title: 'New quote',
      body: 'A buyer submitted a quote',
      link: '/admin/quotes/123',
      subjectType: 'QUOTE',
      subjectId: '123',
    })

    const notifs = await prisma.notification.findMany({ orderBy: { userId: 'asc' } })
    expect(notifs).toHaveLength(2)
    expect(notifs[0]?.type).toBe('QUOTE_SUBMITTED')
    expect(notifs[0]?.link).toBe('/admin/quotes/123')
  })

  it('attempts email send and stamps emailSentAt on success', async () => {
    const user = await prisma.user.create({ data: { email: 'd3@test.com', name: 'C' } })
    await dispatch({
      userIds: [user.id],
      type: 'QUOTE_QUOTED',
      title: 'Your quote is ready',
      body: 'View it now',
      link: '/quotes/abc',
    })

    const notif = await prisma.notification.findFirst({ where: { userId: user.id } })
    expect(notif?.emailSentAt).not.toBeNull()
  })

  it('skips when userIds is empty', async () => {
    await dispatch({
      userIds: [],
      type: 'QUOTE_SUBMITTED',
      title: 't',
      body: 'b',
    })
    const count = await prisma.notification.count()
    expect(count).toBe(0)
  })
})
