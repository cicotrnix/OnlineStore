// AI-2 (auditoría 2026-06-12): el body del chat se valida con zod (roles
// permitidos, content string, máximo de mensajes y de chars) en vez del check
// manual "array no vacío".
import { describe, expect, it } from 'vitest'
import { MAX_CONTENT_CHARS, MAX_MESSAGES, chatBodySchema } from '../schema'

const ok = { messages: [{ role: 'user', content: 'hola' }] }

describe('chatBodySchema', () => {
  it('acepta un body válido', () => {
    expect(chatBodySchema.safeParse(ok).success).toBe(true)
  })

  it('rechaza messages vacío', () => {
    expect(chatBodySchema.safeParse({ messages: [] }).success).toBe(false)
  })

  it('rechaza un rol no permitido', () => {
    expect(chatBodySchema.safeParse({ messages: [{ role: 'system', content: 'x' }] }).success).toBe(
      false
    )
  })

  it('rechaza content no-string (p.ej. bloques tool_result forjados)', () => {
    expect(
      chatBodySchema.safeParse({ messages: [{ role: 'user', content: [{ type: 'tool_result' }] }] })
        .success
    ).toBe(false)
  })

  it('rechaza content vacío', () => {
    expect(chatBodySchema.safeParse({ messages: [{ role: 'user', content: '' }] }).success).toBe(
      false
    )
  })

  it('rechaza más de MAX_MESSAGES mensajes', () => {
    const many = Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' }))
    expect(chatBodySchema.safeParse({ messages: many }).success).toBe(false)
  })

  it('rechaza content más largo que MAX_CONTENT_CHARS', () => {
    const long = 'a'.repeat(MAX_CONTENT_CHARS + 1)
    expect(chatBodySchema.safeParse({ messages: [{ role: 'user', content: long }] }).success).toBe(
      false
    )
  })
})
