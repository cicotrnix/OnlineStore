interface Bucket {
  minuteTimestamps: number[]
  hourTimestamps: number[]
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

export interface RateLimitConfig {
  perMinute: number
  perHour: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const oneMinAgo = now - 60_000
  const oneHourAgo = now - 3_600_000

  let bucket = buckets.get(key)
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKeys = Array.from(buckets.keys()).slice(0, MAX_BUCKETS / 2)
      for (const k of oldestKeys) buckets.delete(k)
    }
    bucket = { minuteTimestamps: [], hourTimestamps: [] }
    buckets.set(key, bucket)
  }

  bucket.minuteTimestamps = bucket.minuteTimestamps.filter((t) => t > oneMinAgo)
  bucket.hourTimestamps = bucket.hourTimestamps.filter((t) => t > oneHourAgo)

  if (bucket.minuteTimestamps.length >= config.perMinute) {
    const oldest = bucket.minuteTimestamps[0] as number
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000)),
    }
  }
  if (bucket.hourTimestamps.length >= config.perHour) {
    const oldest = bucket.hourTimestamps[0] as number
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + 3_600_000 - now) / 1000)),
    }
  }

  bucket.minuteTimestamps.push(now)
  bucket.hourTimestamps.push(now)
  return {
    allowed: true,
    remaining: config.perMinute - bucket.minuteTimestamps.length,
    retryAfterSeconds: 0,
  }
}

export function resetRateLimits(): void {
  buckets.clear()
}

export const ANON_SEARCH_LIMITS: RateLimitConfig = { perMinute: 10, perHour: 100 }
