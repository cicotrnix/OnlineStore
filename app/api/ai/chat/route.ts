import { auth } from '@/lib/auth/config'
import { getLocale } from '@/lib/i18n'
import { AI_CHAT_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { runChat } from '@/modules/ai/chat'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Body {
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: Request) {
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const userId = session?.user?.id ?? null

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`chat:${userId ?? ip}`, AI_CHAT_LIMITS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const body = (await req.json()) as Body
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const locale = await getLocale({ userId })
  try {
    const result = await runChat({ messages: body.messages, orgId, locale })
    return NextResponse.json(result)
  } catch (err) {
    const code = err instanceof Error ? err.name : 'Unknown'
    return NextResponse.json({ error: code, message: String(err) }, { status: 503 })
  }
}
