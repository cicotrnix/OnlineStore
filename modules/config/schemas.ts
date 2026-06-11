import { z } from 'zod'

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex color')

export const storeConfigSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    logo: z.string().min(1),
    supportEmail: z.string().email(),
    tagline: z.string().optional(),
    brandVoice: z
      .object({
        audience: z.string().min(1),
        tone: z.string().min(1),
        rules: z.array(z.string()).default([]),
      })
      .optional(),
  }),
  locale: z.object({
    default: z.string(),
    supported: z.array(z.string()).min(1),
  }),
  currency: z.object({
    base: z.enum(['USD']),
  }),
  modules: z.object({
    rfq: z.boolean(),
    credit: z.boolean(),
    privateCatalogs: z.boolean(),
    approvals: z.boolean(),
    volumeDiscounts: z.boolean(),
    semanticSearch: z.boolean(),
  }),
  payments: z.object({
    stripe: z.object({ enabled: z.boolean() }),
    mercadopago: z.object({ enabled: z.boolean() }),
    // Fase 5: extensión del bloque (no reemplazo). Opcional para retrocompat.
    // B6 (Fase 6): campos de instrucciones de wire opcionales. La página
    // de factura las muestra sólo si wireInstructionsReady(cfg) es true
    // (enabled + beneficiaryName + accountNumber). Si faltan, no se muestra
    // nada (gate explícito; no se publican datos a medias).
    wire: z
      .object({
        enabled: z.boolean(),
        beneficiaryName: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        routingNumber: z.string().optional(),
        swift: z.string().optional(),
        accountType: z.string().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional(),
    netTerms: z.boolean().optional(), // Fase 2 dormido por flag (default false)
    card: z.object({ enabled: z.boolean() }).optional(),
  }),
  shipping: z
    .object({
      fedex: z.object({ enabled: z.boolean() }).default({ enabled: true }),
      export: z.object({ forwarderRequired: z.boolean() }).default({ forwarderRequired: true }),
    })
    .optional(),
  accounting: z
    .object({
      basis: z.enum(['accrual', 'cash']).default('accrual'),
      baseCurrency: z.enum(['USD']).default('USD'),
    })
    .optional(),
  analytics: z
    .object({
      posthog: z.object({ enabled: z.boolean() }).default({ enabled: false }),
      ga4: z.object({ enabled: z.boolean() }).default({ enabled: false }),
    })
    .optional(),
  webhooks: z
    .object({
      enabled: z.boolean().default(true),
    })
    .optional(),
  ui: z.object({
    defaultView: z.enum(['cards', 'list']),
    allowToggle: z.boolean(),
  }),
  ai: z.object({
    model: z.string().min(1),
    chatModel: z.string().min(1),
    contentModel: z.string().min(1),
    content: z.boolean(),
    chat: z.boolean(),
    recommendations: z.boolean(),
  }),
})

export const themeConfigSchema = z.object({
  colors: z.object({
    primary: hexColor,
    accent: hexColor,
    surface: hexColor,
    muted: hexColor,
    danger: hexColor,
  }),
  typography: z.object({
    sans: z.string().min(1),
    mono: z.string().min(1).optional(),
    scale: z.enum(['compact', 'comfortable', 'spacious']),
  }),
  radius: z.object({
    card: z.number().int().min(0),
    button: z.number().int().min(0),
    input: z.number().int().min(0),
  }),
  density: z.enum(['compact', 'regular', 'spacious']),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type ThemeConfig = z.infer<typeof themeConfigSchema>
