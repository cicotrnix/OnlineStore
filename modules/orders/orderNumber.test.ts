import { prisma } from '@/lib/db/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { generateOrderNumber } from './orderNumber'

beforeEach(async () => {
  const year = new Date().getFullYear()
  await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS order_seq_${year}`)
})

describe('generateOrderNumber', () => {
  it('generates first number ORD-{year}-000001', async () => {
    const num = await generateOrderNumber()
    const year = new Date().getFullYear()
    expect(num).toBe(`ORD-${year}-000001`)
  })

  it('generates sequential numbers', async () => {
    const a = await generateOrderNumber()
    const b = await generateOrderNumber()
    const c = await generateOrderNumber()
    const year = new Date().getFullYear()
    expect(a).toBe(`ORD-${year}-000001`)
    expect(b).toBe(`ORD-${year}-000002`)
    expect(c).toBe(`ORD-${year}-000003`)
  })

  it('handles 50 concurrent calls without collision', async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => generateOrderNumber()))
    const unique = new Set(results)
    expect(unique.size).toBe(50)
  })
})
