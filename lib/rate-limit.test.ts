import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_CHAT_LIMITS,
  AI_CONTENT_GEN_LIMITS,
  checkRateLimit,
  resetRateLimits,
} from './rate-limit'

beforeEach(() => {
  resetRateLimits()
})

describe('rate-limit', () => {
  it('allows under limit', () => {
    const r1 = checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 })
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(9)
  })

  it('blocks after exceeding per-minute', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 })
    const blocked = checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('different IPs have independent counters', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 })
    const otherIp = checkRateLimit('5.6.7.8', { perMinute: 10, perHour: 100 })
    expect(otherIp.allowed).toBe(true)
  })

  it('rolls back after minute window', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 10; i++) checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 })
    expect(checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 }).allowed).toBe(false)
    vi.advanceTimersByTime(61_000)
    expect(checkRateLimit('1.2.3.4', { perMinute: 10, perHour: 100 }).allowed).toBe(true)
    vi.useRealTimers()
  })

  it('blocks after exceeding per-hour even if per-minute resets', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 100; i++) {
      checkRateLimit('1.2.3.4', { perMinute: 100, perHour: 100 })
    }
    const blocked = checkRateLimit('1.2.3.4', { perMinute: 100, perHour: 100 })
    expect(blocked.allowed).toBe(false)
    vi.useRealTimers()
  })
})

describe('AI rate-limit presets', () => {
  it('chat es más estricto que content-gen por minuto', () => {
    expect(AI_CHAT_LIMITS).toEqual({ perMinute: 5, perHour: 30 })
    expect(AI_CONTENT_GEN_LIMITS).toEqual({ perMinute: 3, perHour: 10 })
  })
})
