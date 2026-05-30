import { z } from 'zod'

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex color')

export const storeConfigSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    logo: z.string().min(1),
    supportEmail: z.string().email(),
    tagline: z.string().optional(),
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
  }),
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
