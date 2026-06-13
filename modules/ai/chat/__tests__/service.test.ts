import { beforeEach, describe, expect, it, vi } from 'vitest'

const messagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: messagesCreate }
  },
}))
vi.mock('@/modules/ai/budget', () => ({
  isBudgetExceeded: vi.fn().mockResolvedValue(false),
  recordUsage: vi.fn().mockResolvedValue(undefined),
  currentPeriodYm: vi.fn().mockReturnValue('2026-05'),
}))
vi.mock('../tools', () => ({
  handleTool: vi.fn(),
  TOOL_SCHEMAS: [
    {
      name: 'searchProducts',
      description: '',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
  ],
}))

beforeEach(() => {
  messagesCreate.mockReset()
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-test'
})

describe('runChat', () => {
  it('responde con texto cuando el modelo no usa tools', async () => {
    messagesCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { runChat } = await import('../service')
    const r = await runChat({
      messages: [{ role: 'user', content: 'hi' }],
      orgId: null,
      locale: 'en-US',
    })
    expect(r.text).toBe('Hello')
    expect(r.toolCalls).toEqual([])
  })

  it('ejecuta una tool y devuelve la respuesta final', async () => {
    const { handleTool } = await import('../tools')
    vi.mocked(handleTool).mockResolvedValueOnce({
      ok: true,
      data: { results: [{ id: 'p1', name: 'Battery' }] },
    })

    messagesCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'searchProducts',
            input: { query: 'iPhone' },
          },
        ],
        usage: { input_tokens: 50, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Found 1 product: Battery' }],
        usage: { input_tokens: 80, output_tokens: 12 },
      })

    const { runChat } = await import('../service')
    const r = await runChat({
      messages: [{ role: 'user', content: 'find battery' }],
      orgId: null,
      locale: 'en-US',
    })
    expect(r.text).toContain('Battery')
    expect(r.toolCalls).toHaveLength(1)
    expect(r.toolCalls[0]?.name).toBe('searchProducts')
    expect(messagesCreate).toHaveBeenCalledTimes(2)
  })

  it('aborta después de MAX_TOOL_ROUNDS', async () => {
    const { handleTool } = await import('../tools')
    vi.mocked(handleTool).mockResolvedValue({ ok: true, data: {} })
    messagesCreate.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tu_x',
          name: 'searchProducts',
          input: { query: 'x' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { runChat } = await import('../service')
    const r = await runChat({
      messages: [{ role: 'user', content: 'loop' }],
      orgId: null,
      locale: 'en-US',
    })
    expect(r.text).toMatch(/limit/i)
  })

  it('AI-2: corta si el presupuesto se excede en un round posterior (no solo el 1º)', async () => {
    const { isBudgetExceeded } = await import('@/modules/ai/budget')
    // Round 0: ok. Round 1 (tras gastar tokens): excedido → throw.
    vi.mocked(isBudgetExceeded).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const { handleTool } = await import('../tools')
    vi.mocked(handleTool).mockResolvedValue({ ok: true, data: {} })
    messagesCreate.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu_b', name: 'searchProducts', input: { query: 'x' } }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const { runChat } = await import('../service')
    await expect(
      runChat({ messages: [{ role: 'user', content: 'x' }], orgId: null, locale: 'en-US' })
    ).rejects.toThrow(/budget/i)
    // Solo alcanzó a llamar al modelo una vez (round 0); el round 1 cortó antes.
    expect(messagesCreate).toHaveBeenCalledTimes(1)
  })
})
