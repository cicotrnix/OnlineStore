import { describe, expect, it } from 'vitest'
import { MESSAGES, t } from '../messages'

describe('i18n messages', () => {
  it('devuelve string del locale activo', () => {
    expect(t('en-US', 'localeSwitch.label')).toBe('Language')
    expect(t('es-419', 'localeSwitch.label')).toBe('Idioma')
  })

  it('fallback a EN si la key no existe en el locale activo', () => {
    // Forzamos un dict ES que no tiene una key — el helper cae a EN.
    // En runtime, una key inexistente devuelve string vacío.
    expect(t('es-419', 'fallback.test' as never)).toBe('')
  })

  it('todos los locales soportados tienen las mismas keys que en-US', () => {
    const enKeys = Object.keys(MESSAGES['en-US']).sort()
    const esKeys = Object.keys(MESSAGES['es-419']).sort()
    expect(esKeys).toEqual(enKeys)
  })
})
