import { promises as fs } from 'node:fs'
import path from 'node:path'
import { MarkdownContent } from '@/components/commerce/MarkdownContent'
import { auth } from '@/lib/auth/config'
import { type MessageKey, getLocale, t } from '@/lib/i18n'

/**
 * Lee el markdown legal desde `docs/legal/<file>.md` en request time (fs).
 * El contenido vinculante (borrador pendiente de abogado) es el texto actual:
 * NO se traduce por idioma — la estructura soporta swap por locale más adelante.
 * Placeholders como `[STATE]` / `[FECHA]` se sirven tal cual (los completa Herney).
 */
async function readLegalDoc(file: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'docs', 'legal', `${file}.md`)
  return fs.readFile(filePath, 'utf8')
}

export async function LegalPage({
  file,
  titleKey,
}: {
  file: string
  titleKey: MessageKey
}) {
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const markdown = await readLegalDoc(file)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(locale, titleKey)}</h1>
      <p className="mt-2 text-xs text-gray-400">{t(locale, 'legal.draftNotice')}</p>
      <MarkdownContent markdown={markdown} className="mt-8" />
    </main>
  )
}
