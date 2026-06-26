/**
 * Smoke de render de emails en el MISMO contexto que prod: pnpm tsx (esbuild),
 * no vitest. Recorre TODOS los NotificationType vía renderEmailFor y reporta
 * cuáles renderizan HTML y cuáles tiran (ej. "React is not defined").
 *
 *   pnpm tsx scripts/smoke-email-render.ts
 *
 * El cron real (scripts/process-domain-events.ts) renderiza por este mismo path.
 */
import { renderEmailFor } from '@/modules/notifications/email'
import { NotificationType } from '@prisma/client'

async function main() {
  const vars = { title: 'Asunto', body: 'Cuerpo del mensaje.', link: '/x', userName: 'Buyer' }
  const results: { type: string; ok: boolean; error?: string }[] = []

  for (const type of Object.values(NotificationType)) {
    try {
      const html = await renderEmailFor(type, vars, 'en-US')
      results.push({ type, ok: html.length > 0 })
    } catch (e) {
      results.push({ type, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.type}${r.error ? ` — ${r.error}` : ''}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length}/${results.length} FAILED`)
  process.exitCode = failed.length > 0 ? 1 : 0
}

main()
