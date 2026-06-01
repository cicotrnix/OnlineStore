import { defineStoreConfig } from './modules/config'

/**
 * Store configuration — change identity, modules, payments, UI defaults here.
 * Edit and the storefront updates accordingly.
 */
export default defineStoreConfig({
  identity: {
    name: 'PiPower',
    logo: '/logo-pipower.png',
    supportEmail: 'support@pipower.example',
    tagline: 'Baterías mayoristas para iPhone · USA + LATAM',
    brandVoice: {
      audience:
        'Independent iPhone repair professionals and authorized service shops across USA and Latin America',
      tone: 'technical, precise, factual, no hype, no marketing fluff',
      rules: [
        'Write in second person ("you") when addressing the buyer.',
        'No emoji.',
        'No exclamation marks except for explicit CTAs.',
        'Metric units first, imperial in parentheses when relevant.',
        'Cite specific compatibility (iPhone model + A-number) when available.',
        'If a spec is missing from the attributes, omit that section. Never fabricate.',
        'Avoid words like "amazing", "revolutionary", "the best".',
      ],
    },
  },
  locale: {
    default: 'en-US',
    supported: ['en-US', 'es-419'],
  },
  currency: { base: 'USD' },
  modules: {
    rfq: true,
    credit: true,
    privateCatalogs: true,
    approvals: true,
    volumeDiscounts: true,
    semanticSearch: false,
  },
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false },
  },
  ui: {
    defaultView: 'cards',
    allowToggle: true,
  },
  ai: {
    model: 'claude-sonnet-4-6',
    contentModel: 'claude-sonnet-4-6',
    chatModel: 'claude-haiku-4-5-20251001',
    content: true,
    chat: true,
    recommendations: true,
  },
})
