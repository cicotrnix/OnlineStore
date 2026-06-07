import { themeToCssVars } from '@/lib/theme/apply'
import { getStoreTheme } from '@/stores'
import { describe, expect, it } from 'vitest'

describe('theme smoke', () => {
  it('genera las CSS vars de la tienda activa', () => {
    const css = themeToCssVars(getStoreTheme())
    expect(css).toContain('--color-primary')
  })
})
