import { logger } from '@/lib/observability/logger'
import { getStoreConfig } from '@/stores'
import { Resend } from 'resend'

let client: Resend | null = null

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not set')
    }
    client = new Resend(apiKey)
  }
  return client
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  id: string
}

/**
 * Send a transactional email via Resend.
 * In dev/test without RESEND_API_KEY, logs the email and returns a mock id.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info({ to: input.to, subject: input.subject }, '[email:noop] RESEND_API_KEY not set')
    return { id: 'noop-no-api-key' }
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const fromName = `${getStoreConfig().identity.name} <${from}>`
  const result = await getClient().emails.send({
    from: fromName,
    to: input.to,
    subject: input.subject,
    html: input.html,
  })
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`)
  }
  return { id: result.data?.id ?? '' }
}
