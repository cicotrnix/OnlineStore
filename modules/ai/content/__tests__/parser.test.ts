import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseContentSections } from '../parser'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('parseContentSections', () => {
  it('extrae secciones de un output bien formado', () => {
    const sample = readFileSync(join(__dirname, 'fixtures', 'sample-en.txt'), 'utf-8')
    const r = parseContentSections(sample)
    expect(r.longDescriptionMd).toContain('OVERVIEW')
    expect(r.longDescriptionMd).toContain('SPECS')
    expect(r.shortDescription).toBeTruthy()
    expect(r.shortDescription.length).toBeLessThanOrEqual(160)
    expect(r.seoTitle.length).toBeLessThanOrEqual(70)
    expect(r.seoDescription.length).toBeLessThanOrEqual(170)
  })

  it('tolera secciones faltantes (devuelve strings vacíos)', () => {
    const r = parseContentSections('## OVERVIEW\nFoo\n## SHORT\nBar')
    expect(r.longDescriptionMd).toContain('OVERVIEW')
    expect(r.shortDescription).toBe('Bar')
    expect(r.seoTitle).toBe('')
    expect(r.seoDescription).toBe('')
  })

  it('extrae output en español', () => {
    const sample = readFileSync(join(__dirname, 'fixtures', 'sample-es.txt'), 'utf-8')
    const r = parseContentSections(sample)
    expect(r.shortDescription).toContain('Batería')
    expect(r.seoTitle).toContain('Batería')
  })
})
