import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enqueueContentJob, processContentJobs } from '../content-jobs'

async function makeProduct() {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const cat = await prisma.category.create({
    data: { slug: `c-${unique}`, name: 'C' },
  })
  return prisma.product.create({
    data: {
      sku: `S-${unique}`,
      slug: `s-${unique}`,
      name: 'P',
      basePrice: '1.00',
      categoryId: cat.id,
    },
  })
}

describe('AiContentJob queue', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('enqueue es idempotente por (productId, locale) PENDING', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    await enqueueContentJob(p.id, 'en-US')
    const jobs = await prisma.aiContentJob.findMany({
      where: { productId: p.id, status: 'PENDING' },
    })
    expect(jobs).toHaveLength(1)
  })

  it('process marca DONE cuando el handler resuelve', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'es-419')
    const handler = vi.fn().mockResolvedValue(undefined)
    const res = await processContentJobs(handler)
    expect(handler).toHaveBeenCalledOnce()
    expect(res.processed).toBe(1)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('DONE')
  })

  it('un fallo deja el job en PENDING con attempts=1 (reintento, MAX_ATTEMPTS=5)', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    const res = await processContentJobs(vi.fn().mockRejectedValue(new Error('boom')))
    expect(res.failed).toBe(1)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('PENDING')
    expect(job?.attempts).toBe(1)
  })

  it('tras 5 fallos consecutivos marca FAILED', async () => {
    const p = await makeProduct()
    await enqueueContentJob(p.id, 'en-US')
    const failing = vi.fn().mockRejectedValue(new Error('boom'))
    for (let i = 0; i < 5; i++) await processContentJobs(failing)
    const job = await prisma.aiContentJob.findFirst({ where: { productId: p.id } })
    expect(job?.status).toBe('FAILED')
    expect(job?.attempts).toBe(5)
  })
})
