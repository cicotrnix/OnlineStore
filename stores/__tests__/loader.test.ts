import { storeConfigSchema, themeConfigSchema } from '@/modules/config'
import { STORE_REGISTRY, _setRegistry, getStoreConfig, getStoreTheme } from '@/stores'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  _setRegistry(null)
  vi.unstubAllEnvs()
})

function acmeEntry() {
  const base = STORE_REGISTRY.pipower
  if (!base) throw new Error('pipower debe existir en el registry')
  return {
    config: { ...base.config, identity: { ...base.config.identity, name: 'Acme' } },
    theme: base.theme,
  }
}

describe('stores loader', () => {
  it('dev/test sin STORE_ID → pipower (default)', () => {
    vi.stubEnv('STORE_ID', '')
    expect(getStoreConfig().identity.name).toBe('PiPower')
  })

  it('STORE_ID válido → config de esa tienda', () => {
    _setRegistry({ acme: acmeEntry() })
    vi.stubEnv('STORE_ID', 'acme')
    expect(getStoreConfig().identity.name).toBe('Acme')
  })

  it('_setRegistry invalida el cache del loader', () => {
    expect(getStoreConfig().identity.name).toBe('PiPower')
    _setRegistry({ acme: acmeEntry() })
    vi.stubEnv('STORE_ID', 'acme')
    expect(getStoreConfig().identity.name).toBe('Acme')
  })

  it('STORE_ID desconocido → throw con el id en el mensaje', () => {
    vi.stubEnv('STORE_ID', 'nope')
    expect(() => getStoreConfig()).toThrow(/nope/)
  })

  it('producción sin STORE_ID → throw (obligatorio)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STORE_ID', '')
    expect(() => getStoreConfig()).toThrow(/STORE_ID/)
  })

  it('cada entrada del registry valida contra los schemas', () => {
    for (const [id, entry] of Object.entries(STORE_REGISTRY)) {
      expect(() => storeConfigSchema.parse(entry.config), `config de ${id}`).not.toThrow()
      expect(() => themeConfigSchema.parse(entry.theme), `theme de ${id}`).not.toThrow()
    }
  })

  it('getStoreTheme devuelve el theme de la tienda activa', () => {
    vi.stubEnv('STORE_ID', 'pipower')
    expect(getStoreTheme()).toBe(STORE_REGISTRY.pipower?.theme)
  })
})
