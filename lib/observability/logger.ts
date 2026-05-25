import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
      }
    : undefined,
})

export function withRequestContext(context: {
  requestId?: string
  userId?: string
  organizationId?: string
}) {
  return logger.child(context)
}
