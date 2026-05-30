import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

describe('AIProvider', () => {
  beforeEach(() => {
    create.mockReset()
    // biome-ignore lint/performance/noDelete: must fully unset to test isAIEnabled() === false
    delete process.env.ANTHROPIC_API_KEY
  })
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: must fully unset to test isAIEnabled() === false
    delete process.env.ANTHROPIC_API_KEY
  })

  it('isAIEnabled refleja la env var', async () => {
    const { isAIEnabled } = await import('../provider')
    expect(isAIEnabled()).toBe(false)
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    expect(isAIEnabled()).toBe(true)
  })

  it('complete lanza AIDisabledError sin key', async () => {
    const { complete } = await import('../provider')
    const { AIDisabledError } = await import('../errors')
    await expect(complete('hola', {})).rejects.toBeInstanceOf(AIDisabledError)
  })

  it('complete devuelve texto + usage con key', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    create.mockResolvedValue({
      content: [{ type: 'text', text: 'respuesta' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { complete } = await import('../provider')
    const out = await complete('prompt', { system: 'eres util', maxTokens: 100 })
    expect(out.text).toBe('respuesta')
    expect(out.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    expect(create).toHaveBeenCalledOnce()
  })
})
