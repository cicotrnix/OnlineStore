import type { JSX, ReactNode } from 'react'

/**
 * Render mínimo y dep-free del markdown que genera el contenido AI
 * (`ProductContent.longDescriptionMd`): headings `##`/`###`, listas `-`/`*`,
 * `**bold**` inline y párrafos separados por línea en blanco. Sin librería
 * externa (política de deps). El texto plano (fallback `product.description`)
 * cae a párrafos legibles. No interpreta HTML — solo lee el subset que el AI usa.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((s) => s !== '')
    .map((seg, i) => {
      const m = /^\*\*([^*]+)\*\*$/.exec(seg)
      return m ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: render estático de markdown
        <strong key={`${keyBase}-${i}`} className="font-semibold text-gray-900">
          {m[1]}
        </strong>
      ) : (
        seg
      )
    })
}

export function MarkdownContent({
  markdown,
  className = '',
}: {
  markdown: string
  className?: string
}): JSX.Element {
  const lines = markdown.split('\n')
  const blocks: ReactNode[] = []
  let para: string[] = []
  let list: string[] = []

  const flushPara = () => {
    if (para.length > 0) {
      const k = `p-${blocks.length}`
      blocks.push(
        <p key={k} className="mt-3 text-sm leading-relaxed text-gray-700 first:mt-0">
          {inline(para.join(' '), k)}
        </p>
      )
      para = []
    }
  }
  const flushList = () => {
    if (list.length > 0) {
      const k = `ul-${blocks.length}`
      blocks.push(
        <ul key={k} className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {list.map((li, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lista estática de markdown
            <li key={`${k}-${i}`}>{inline(li, `${k}-${i}`)}</li>
          ))}
        </ul>
      )
      list = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') {
      flushPara()
      flushList()
      continue
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(line)
    const b = /^[-*]\s+(.*)$/.exec(line)
    if (h) {
      flushPara()
      flushList()
      const k = `h-${blocks.length}`
      const lvl = (h[1] ?? '##').length
      const Tag = (lvl === 2 ? 'h3' : lvl === 3 ? 'h4' : 'h5') as keyof JSX.IntrinsicElements
      blocks.push(
        <Tag
          key={k}
          className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-900 first:mt-0"
        >
          {inline(h[2] ?? '', k)}
        </Tag>
      )
    } else if (b) {
      flushPara()
      list.push(b[1] ?? '')
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()

  return <div className={className}>{blocks}</div>
}
