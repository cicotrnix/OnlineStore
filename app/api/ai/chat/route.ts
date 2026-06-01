import { auth } from '@/lib/auth/config'
import { getLocale } from '@/lib/i18n'
import { AI_CHAT_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { runChat } from '@/modules/ai/chat'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Body {
  messages: { role: 'user' | 'assistant'; content: string }[]
}

const CHUNK_SIZE = 16
const CHUNK_DELAY_MS = 25

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

  let result: Awaited<ReturnType<typeof runChat>>
  try {
    result = await runChat({ messages: body.messages, orgId, locale })
  } catch (err) {
    const code = err instanceof Error ? err.name : 'Unknown'
    return NextResponse.json({ error: code, message: String(err) }, { status: 503 })
  }

  // Streaming UX: chunk del texto final para que el widget lo muestre
  // progresivamente. Tool-use rounds ya corrieron sin stream — el costo
  // adicional aquí es solo la presentación.
  const encoder = new TextEncoder()
  const text = result.text
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        controller.enqueue(encoder.encode(text.slice(i, i + CHUNK_SIZE)))
        if (CHUNK_DELAY_MS > 0) await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Tool-Calls': JSON.stringify(result.toolCalls),
    },
  })
}
