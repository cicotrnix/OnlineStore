import type { Locale } from '@/lib/i18n'

export interface BrandVoice {
  audience: string
  tone: string
  rules: string[]
}

export interface BuildPromptInput {
  brandVoice: BrandVoice
  productName: string
  categoryName: string
  attributes: Record<string, unknown>
  locale: Locale
}

const LOCALE_INSTRUCTION: Record<Locale, string> = {
  'en-US': 'Write all content in English (en-US).',
  'es-419': 'Write all content in Latin American Spanish (es-419).',
}

export function buildContentPrompt(input: BuildPromptInput): string {
  const attrEntries = Object.entries(input.attributes).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  )
  const attrBlock = attrEntries.length
    ? attrEntries.map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')
    : '(no structured attributes provided)'

  return [
    `You are writing wholesale B2B product content for: "${input.productName}" (category: ${input.categoryName}).`,
    '',
    `Audience: ${input.brandVoice.audience}`,
    `Tone: ${input.brandVoice.tone}`,
    'Voice rules:',
    ...input.brandVoice.rules.map((r) => `- ${r}`),
    '',
    LOCALE_INSTRUCTION[input.locale],
    '',
    'You may ONLY use the structured attributes below. Do NOT invent specs. If a section has no relevant attribute, omit it.',
    '',
    'Attributes:',
    attrBlock,
    '',
    'Output EXACTLY these sections in this order, prefixed by the heading shown:',
    '## OVERVIEW',
    '(2-3 sentences)',
    '## SPECS',
    '(bulleted list from provided attributes only)',
    '## INSTALLATION',
    '(only if attributes mention installation/soldering/flex)',
    '## INCLUDED',
    '(only if attributes mention included items)',
    '## SAFETY',
    '(only if attributes mention hazmat/shipping/handling)',
    '## WARRANTY',
    '(only if attributes mention warranty_months)',
    '## SHORT',
    '(one sentence, max 160 chars, suitable for product card)',
    '## SEO_TITLE',
    '(max 60 chars)',
    '## SEO_DESCRIPTION',
    '(max 160 chars)',
  ].join('\n')
}
