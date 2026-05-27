import { EmbeddingFailedError } from './errors'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3-lite'
const DIMS = 512

export function isVoyageEnabled(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY)
}

interface VoyageResponse {
  data: Array<{ embedding: number[] }>
}

async function voyageRequest(text: string, inputType: 'query' | 'document'): Promise<number[]> {
  if (!isVoyageEnabled()) {
    throw new EmbeddingFailedError('Voyage not configured: missing VOYAGE_API_KEY', false)
  }

  const truncated = text.slice(0, 8000)

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [truncated],
      model: MODEL,
      input_type: inputType,
    }),
  })

  if (!response.ok) {
    const isRetryable = response.status === 429 || response.status >= 500
    const body = await response.text().catch(() => '')
    throw new EmbeddingFailedError(`Voyage API ${response.status}: ${body}`, isRetryable)
  }

  const data: VoyageResponse = await response.json()
  const embedding = data.data[0]?.embedding
  if (!embedding || embedding.length !== DIMS) {
    throw new EmbeddingFailedError(
      `Voyage returned invalid embedding (length ${embedding?.length})`,
      false
    )
  }
  return embedding
}

/**
 * Embed user search query — fail fast (max 1 retry).
 * Search path: user is waiting; degrade to Meilisearch-only rather than block.
 */
export async function embedQuery(text: string): Promise<number[]> {
  try {
    return await voyageRequest(text, 'query')
  } catch (err) {
    if (err instanceof EmbeddingFailedError && err.retryable) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return voyageRequest(text, 'query')
    }
    throw err
  }
}

/**
 * Embed product document — full exponential backoff (up to 5 retries).
 * Indexer path: async, can wait; correctness > latency.
 */
export async function embedDocument(
  text: string,
  opts: { skipBackoffDelay?: boolean } = {}
): Promise<number[]> {
  const delays = [1000, 2000, 4000, 8000, 16000]
  let lastErr: unknown
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await voyageRequest(text, 'document')
    } catch (err) {
      lastErr = err
      if (!(err instanceof EmbeddingFailedError) || !err.retryable || i === delays.length) {
        break
      }
      if (!opts.skipBackoffDelay) {
        await new Promise((resolve) => setTimeout(resolve, delays[i]))
      }
    }
  }
  throw lastErr
}

export const VOYAGE_DIMS = DIMS
export const VOYAGE_MODEL = MODEL
