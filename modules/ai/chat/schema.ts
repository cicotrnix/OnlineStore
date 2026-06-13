import { z } from 'zod'

// AI-2: límites de input del chat (control de costo + anti-abuso). El body se
// valida con zod en el endpoint: roles permitidos, content string acotado, y
// máximos de mensajes/longitud para que una sola request no cargue un contexto
// arbitrariamente grande (× hasta MAX_TOOL_ROUNDS rounds de tool-use).
export const MAX_MESSAGES = 30
export const MAX_CONTENT_CHARS = 4000

export const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(MAX_CONTENT_CHARS),
      })
    )
    .min(1)
    .max(MAX_MESSAGES),
})

export type ChatBody = z.infer<typeof chatBodySchema>
