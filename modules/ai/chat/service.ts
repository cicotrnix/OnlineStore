import type { Locale } from '@/lib/i18n'
import { logger } from '@/lib/observability/logger'
import { currentPeriodYm, isBudgetExceeded, recordUsage } from '@/modules/ai/budget'
import { AIBudgetExceededError, AIDisabledError } from '@/modules/ai/errors'
import { getStoreConfig } from '@/stores'
import Anthropic from '@anthropic-ai/sdk'
import { TOOL_SCHEMAS, type ToolName, handleTool } from './tools'

const MAX_TOOL_ROUNDS = 5

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RunChatInput {
  messages: ChatMessage[]
  orgId: string | null
  locale: Locale
}

export interface ToolCallTrace {
  name: ToolName
  input: Record<string, unknown>
  ok: boolean
}

export interface RunChatResult {
  text: string
  toolCalls: ToolCallTrace[]
}

let cachedClient: Anthropic | null = null
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return cachedClient
}

function systemPrompt(locale: Locale): string {
  const storeConfig = getStoreConfig()
  return [
    'You are a B2B wholesale assistant for an iPhone parts catalog.',
    'You ONLY answer using data from the provided tools. Do not invent products, prices, or specs.',
    'Wholesale prices are gated by account verification. If a tool result has priceVisible=false (or no priceResolved), DO NOT state any price; invite the user to sign in and get their account verified to see wholesale pricing.',
    'If a tool returns ok=false, tell the user what you tried and direct them to support.',
    'Stay strictly on-topic (the store catalog). Refuse off-topic questions politely.',
    `Respond in the user's locale: ${locale}.`,
    `Brand voice: ${storeConfig.identity.brandVoice?.tone ?? 'neutral, factual'}.`,
  ].join('\n')
}

type AnthropicContent = Anthropic.Messages.ContentBlock

function extractText(content: AnthropicContent[]): string {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Extract<AnthropicContent, { type: 'text' }>).text)
    .join('\n')
}

export async function runChat(input: RunChatInput): Promise<RunChatResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AIDisabledError()

  const storeConfig = getStoreConfig()
  const client = getClient()
  const toolCalls: ToolCallTrace[] = []
  const conversation: Anthropic.MessageParam[] = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // AI-2: chequear el presupuesto en CADA round (antes solo antes del 1º).
    // Un loop de tool-use de hasta MAX_TOOL_ROUNDS puede gastar mucho entre
    // rounds; cortar apenas se excede.
    if (await isBudgetExceeded()) throw new AIBudgetExceededError(currentPeriodYm())
    const msg = await client.messages.create({
      model: storeConfig.ai.chatModel,
      max_tokens: 1024,
      system: systemPrompt(input.locale),
      tools: TOOL_SCHEMAS as never,
      messages: conversation,
    })
    await recordUsage(msg.usage.input_tokens + msg.usage.output_tokens)
    logger.info({ model: storeConfig.ai.chatModel, usage: msg.usage, round }, 'ai chat tick')

    if (msg.stop_reason !== 'tool_use') {
      return { text: extractText(msg.content), toolCalls }
    }

    conversation.push({ role: 'assistant', content: msg.content as never })
    const toolResults: Array<{
      type: 'tool_result'
      tool_use_id: string
      content: string
    }> = []
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue
      const result = await handleTool(
        block.name as ToolName,
        block.input as Record<string, unknown>,
        { orgId: input.orgId, locale: input.locale }
      )
      toolCalls.push({
        name: block.name as ToolName,
        input: block.input as Record<string, unknown>,
        ok: result.ok,
      })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      })
    }
    conversation.push({ role: 'user', content: toolResults as never })
  }

  return {
    text: 'I reached the tool-call limit without producing a final answer. Please rephrase or contact support.',
    toolCalls,
  }
}
