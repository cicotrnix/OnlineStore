import { logger } from '@/lib/observability/logger'
import { getStoreConfig } from '@/stores'
import Anthropic from '@anthropic-ai/sdk'
import { currentPeriodYm, isBudgetExceeded, recordUsage } from './budget'
import { AIBudgetExceededError, AIDisabledError } from './errors'

export interface AICompleteOptions {
  system?: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface AICompletion {
  text: string
  usage: { inputTokens: number; outputTokens: number }
}

export function isAIEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// Cliente cacheado lazy (mismo patrón que lib/meilisearch.ts::getMeilisearchClient).
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export async function complete(prompt: string, opts: AICompleteOptions): Promise<AICompletion> {
  if (!isAIEnabled()) throw new AIDisabledError()
  if (await isBudgetExceeded()) throw new AIBudgetExceededError(currentPeriodYm())

  const model = opts.model ?? getStoreConfig().ai.model
  const msg = await getClient().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = msg.content[0]
  const text = block && block.type === 'text' ? block.text : ''
  const usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
  }
  await recordUsage(usage.inputTokens + usage.outputTokens)
  logger.info({ model, usage }, 'ai completion')
  return { text, usage }
}
