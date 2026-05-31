export interface ParsedContent {
  longDescriptionMd: string
  shortDescription: string
  seoTitle: string
  seoDescription: string
}

const LONG_HEADERS = ['OVERVIEW', 'SPECS', 'INSTALLATION', 'INCLUDED', 'SAFETY', 'WARRANTY']

function extractSection(text: string, header: string): string {
  const re = new RegExp(`##\\s*${header}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`)
  const m = text.match(re)
  return m?.[1]?.trim() ?? ''
}

export function parseContentSections(text: string): ParsedContent {
  const longParts: string[] = []
  for (const h of LONG_HEADERS) {
    const body = extractSection(text, h)
    if (body) longParts.push(`## ${h}\n\n${body}`)
  }
  return {
    longDescriptionMd: longParts.join('\n\n'),
    shortDescription: extractSection(text, 'SHORT'),
    seoTitle: extractSection(text, 'SEO_TITLE'),
    seoDescription: extractSection(text, 'SEO_DESCRIPTION'),
  }
}
