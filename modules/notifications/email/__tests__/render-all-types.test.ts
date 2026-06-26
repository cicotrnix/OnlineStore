/**
 * Render de TODOS los NotificationType vía renderEmailFor: HTML no vacío, sin
 * throw. Atrapa templates rotos / faltantes en el mapa. NOTA: vitest transforma
 * el JSX distinto que el cron (pnpm tsx/esbuild), así que este test NO agarra la
 * clase "React is not defined" — eso lo cubre scripts/smoke-email-render.ts
 * corrido en CI con tsx. Los dos juntos cierran el gap test-vs-runtime.
 */
import { renderEmailFor } from '@/modules/notifications/email'
import { NotificationType } from '@prisma/client'
import { describe, expect, it } from 'vitest'

describe('renderEmailFor — cobertura de todos los NotificationType', () => {
  const vars = { title: 'Asunto', body: 'Cuerpo.', link: '/x', userName: 'Buyer' }

  for (const type of Object.values(NotificationType)) {
    it(`renderiza ${type} a HTML no vacío`, async () => {
      const html = await renderEmailFor(type, vars, 'en-US')
      expect(html.length).toBeGreaterThan(0)
    })
  }
})
