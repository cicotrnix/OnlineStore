# Fase 6 · Corte 0 — Multi-store runtime (`STORE_ID`) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app bootea como cualquier tienda del registry según `STORE_ID` (producción: obligatorio; dev/test: default `pipower`), sin regresión alguna del deploy actual.

**Architecture:** Registry síncrono en `stores/index.ts` (imports estáticos de configs por tienda) + loaders cacheados `getStoreConfig()`/`getStoreTheme()`. Migración incremental vía shims re-export en la raíz que se eliminan al final — el typecheck garantiza la completitud. El tema ya es runtime (CSS vars), no cambia Tailwind.

**Tech Stack:** Next.js 14 App Router, TypeScript estricto (`noUncheckedIndexedAccess`), Zod (schemas existentes en `modules/config`), Vitest, Playwright, Biome.

**Spec:** `docs/specs/2026-06-07-fase6-corte-0-multistore-runtime.md`
**Branch:** `feat/fase6-corte0-multistore-runtime` desde `main` actualizado.
**Regla:** gate verde por tarea (`pnpm lint && pnpm typecheck && pnpm test`). Si algo queda rojo → STOP y reportar, no continuar. `pnpm build` SIEMPRE como `STORE_ID=pipower pnpm build` (build corre con NODE_ENV=production).

---

### Task 0: Pre-requisitos — audits (obligatorios, sin código)

**Files:** ninguno (verificación). Resultados van a la descripción del PR.

- [ ] **Step 1: Audit de secretos.** Leer línea por línea `store.config.ts` y `theme.config.ts`. Esperado: solo identidad/locale/currency/flags/nombres de modelo/colores — cero tokens, keys o URLs con credenciales (las configs viajarán en el bundle JS). Si aparece un secreto: **STOP**, moverlo a env var antes de continuar.
- [ ] **Step 2: Audit build-time.** Run: `grep -rn "store.config\|theme.config" next.config.* tailwind.config.* instrumentation.* 2>/dev/null`. Esperado: sin matches (tailwind solo consume `var(--color-*)`). Si hay lectura build-time de config: **STOP** y reportar (decisión pendiente: eliminarla o `STORE_ID` como build-arg).
- [ ] **Step 3:** Anotar ambos resultados para la sección "Pre-req audits" del PR.

### Task 1: Mover configs a `stores/pipower/` con shims (nada se rompe)

**Files:**
- Create: `stores/pipower/store.config.ts` (movido), `stores/pipower/theme.config.ts` (movido)
- Modify: `store.config.ts` y `theme.config.ts` (raíz → shims temporales)

- [ ] **Step 1:** `git mv store.config.ts stores/pipower/store.config.ts && git mv theme.config.ts stores/pipower/theme.config.ts`
- [ ] **Step 2:** En los archivos movidos, cambiar imports relativos de raíz a alias: `from './modules/config'` → `from '@/modules/config'`.
- [ ] **Step 3:** Crear shims en la raíz:

```ts
// store.config.ts (raíz — shim temporal, se elimina en Task 5)
export { default } from './stores/pipower/store.config'
```

```ts
// theme.config.ts (raíz — shim temporal, se elimina en Task 5)
export { default } from './stores/pipower/theme.config'
```

- [ ] **Step 4:** Run `pnpm typecheck && pnpm test` → verde (cero cambio funcional).
- [ ] **Step 5:** Commit: `git add -A && git commit -m "refactor(fase6): move configs to stores/pipower with temporary root shims"`

### Task 2: Registry + loaders (TDD)

**Files:**
- Create: `stores/index.ts`
- Test: `stores/__tests__/loader.test.ts`

- [ ] **Step 1: Test que falla** — `stores/__tests__/loader.test.ts`:

```ts
import { storeConfigSchema, themeConfigSchema } from '@/modules/config'
import { STORE_REGISTRY, _setRegistry, getStoreConfig, getStoreTheme } from '@/stores'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  _setRegistry(null) // restaura registry real + invalida cache
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
    expect(getStoreConfig().identity.name).toBe('PiPower') // resuelve y cachea
    _setRegistry({ acme: acmeEntry() })
    vi.stubEnv('STORE_ID', 'acme')
    expect(getStoreConfig().identity.name).toBe('Acme') // cache invalidado
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
```

- [ ] **Step 2:** Run `pnpm vitest run stores/__tests__/loader.test.ts` → Expected: **FAIL** (`@/stores` no existe).
- [ ] **Step 3: Implementación mínima** — `stores/index.ts`:

```ts
import type { StoreConfig, ThemeConfig } from '@/modules/config'
import pipowerConfig from './pipower/store.config'
import pipowerTheme from './pipower/theme.config'

export interface StoreEntry {
  config: StoreConfig
  theme: ThemeConfig
}

/** Registry real: imports estáticos — todas las configs viajan en el bundle (data, sin secretos). */
export const STORE_REGISTRY: Record<string, StoreEntry> = {
  pipower: { config: pipowerConfig, theme: pipowerTheme },
}

const DEFAULT_STORE_ID = 'pipower'

let registry: Record<string, StoreEntry> = STORE_REGISTRY
let cached: StoreEntry | null = null

/**
 * Resuelve la tienda activa por STORE_ID y cachea (asunción Modelo A:
 * 1 proceso = 1 tienda). Producción: STORE_ID obligatorio. Dev/test:
 * default pipower. '' se trata como ausente. Fail-fast, sin fallback
 * silencioso a otra tienda en prod.
 */
function resolveEntry(): StoreEntry {
  if (cached) return cached
  const raw = process.env.STORE_ID
  const explicit = raw && raw.length > 0 ? raw : null
  const id =
    explicit ?? (process.env.NODE_ENV === 'production' ? null : DEFAULT_STORE_ID)
  if (!id) {
    throw new Error(
      `STORE_ID es obligatorio en producción. Tiendas conocidas: ${Object.keys(registry).join(', ')}`
    )
  }
  const entry = registry[id]
  if (!entry) {
    throw new Error(
      `STORE_ID desconocido "${id}". Tiendas conocidas: ${Object.keys(registry).join(', ')}`
    )
  }
  cached = entry
  return entry
}

export function getStoreConfig(): StoreConfig {
  return resolveEntry().config
}

export function getStoreTheme(): ThemeConfig {
  return resolveEntry().theme
}

/**
 * Solo para tests: reemplaza el registry e INVALIDA el cache.
 * `null` restaura el registry real. Resetear en afterEach
 * (mismo contrato que _setStorageClient en lib/storage).
 */
export function _setRegistry(next: Record<string, StoreEntry> | null): void {
  registry = next ?? STORE_REGISTRY
  cached = null
}
```

- [ ] **Step 4:** Run `pnpm vitest run stores/__tests__/loader.test.ts` → Expected: **PASS** (7/7).
- [ ] **Step 5:** `pnpm typecheck && pnpm test` → verde.
- [ ] **Step 6:** Commit: `git add stores/ && git commit -m "feat(fase6): store registry + STORE_ID loaders with fail-fast (TDD)"`

### Task 3: Tema vía loader en root layout + smoke

**Files:**
- Modify: `app/layout.tsx`
- Test: `stores/__tests__/theme-smoke.test.ts`

- [ ] **Step 1:** Localizar el uso actual: `grep -n "theme.config\|themeToCssVars" app/layout.tsx lib/theme/apply.ts`
- [ ] **Step 2: Smoke test** — `stores/__tests__/theme-smoke.test.ts`:

```ts
import { themeToCssVars } from '@/lib/theme/apply'
import { getStoreTheme } from '@/stores'
import { describe, expect, it } from 'vitest'

describe('theme smoke', () => {
  it('genera las CSS vars de la tienda activa', () => {
    const css = themeToCssVars(getStoreTheme())
    expect(css).toContain('--color-primary')
  })
})
```

Run: `pnpm vitest run stores/__tests__/theme-smoke.test.ts` → PASS (es smoke de regresión, puede pasar de entrada).

- [ ] **Step 3:** En `app/layout.tsx`, reemplazar el import del theme estático por el loader. Patrón (adaptar a la línea exacta encontrada en Step 1):

```diff
- import theme from '@/theme.config'
+ import { getStoreTheme } from '@/stores'
...
- themeToCssVars(theme)
+ themeToCssVars(getStoreTheme())
```

- [ ] **Step 4:** `pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` → verde.
- [ ] **Step 5:** Commit: `git commit -am "feat(fase6): root layout themes via getStoreTheme()"`

### Task 4: Migrar call sites a `getStoreConfig()` (por lotes)

**Receta mecánica por archivo** (válida en module scope y en RSC, el loader es síncrono y cacheado):

```diff
- import storeConfig from '@/store.config'
+ import { getStoreConfig } from '@/stores'
+ const storeConfig = getStoreConfig()
```

(Si el archivo usa `storeConfig` dentro de una función/componente, la `const` puede ir al inicio de esa función — equivalente.)

- [ ] **Step 1: Lote lib + modules** (6 archivos): `lib/auth/config.ts`, `lib/email/resend.ts`, `lib/features.ts`, `modules/ai/chat/service.ts`, `modules/ai/chat/tools.ts`, `modules/ai/content/service.ts`. Aplicar receta. Run `pnpm typecheck && pnpm test` → verde. Commit: `refactor(fase6): migrate lib+modules to getStoreConfig`
- [ ] **Step 2: Check de client components.** Run: `grep -l "'use client'" components/storefront/FeaturedGrid.tsx components/commerce/RelatedProducts.tsx "app/(storefront)/search/_components/SearchResults.tsx"`.
  - Los que **no** sean client → receta normal.
  - Los que **sí** sean client → **no** importan el loader: el server component padre les pasa los valores usados por **props** (patrón `SignInForm`). Ejemplo: si `FeaturedGrid` (client) usa `storeConfig.identity.name`, el padre RSC hace `<FeaturedGrid storeName={getStoreConfig().identity.name} ... />` y el client agrega la prop. Prohibido `NEXT_PUBLIC_STORE_ID`.
- [ ] **Step 3: Lote app/** (resto de archivos — obtener lista exacta con `git grep -l "@/store.config" -- 'app/**' 'components/**'`). Aplicar receta / props según Step 2. Run `pnpm typecheck && pnpm test` → verde. Commit: `refactor(fase6): migrate app pages to getStoreConfig`
- [ ] **Step 4:** Verificar restantes: `git grep -n "@/store.config\|@/theme.config" -- '*.ts' '*.tsx'` → Expected: solo los shims raíz.

### Task 5: Eliminar shims raíz (el typecheck sella la migración)

**Files:** Delete: `store.config.ts`, `theme.config.ts` (raíz)

- [ ] **Step 1:** `git rm store.config.ts theme.config.ts`
- [ ] **Step 2:** `pnpm typecheck` → Expected: **verde**. Si falla: quedó un archivo sin migrar — migrarlo (receta Task 4) y repetir.
- [ ] **Step 3:** `pnpm lint && pnpm test && STORE_ID=pipower pnpm build` → verde.
- [ ] **Step 4:** Commit: `git commit -am "refactor(fase6): remove root config shims — stores/ is the single source"`

### Task 6: Tienda demo (prueba viva del criterio de aceptación 2)

**Files:**
- Create: `stores/demo/store.config.ts`, `stores/demo/theme.config.ts`
- Modify: `stores/index.ts` (+1 entrada), `stores/__tests__/loader.test.ts` (+1 test)

- [ ] **Step 1: Test que falla** (agregar al `describe` de loader.test.ts):

```ts
  it('STORE_ID=demo → sirve la tienda demo del registry real', () => {
    vi.stubEnv('STORE_ID', 'demo')
    expect(getStoreConfig().identity.name).toBe('Demo Store')
  })
```

Run → FAIL (`demo` no existe).

- [ ] **Step 2:** Crear `stores/demo/store.config.ts`: copiar `stores/pipower/store.config.ts` y cambiar **solo**: `identity.name: 'Demo Store'`, `identity.tagline: 'Tienda de demostración Fase 6'`, `identity.supportEmail: 'demo@example.com'`. Crear `stores/demo/theme.config.ts`: copiar el de pipower y cambiar el color primario a otro visiblemente distinto (ej. un verde). Registrar en `stores/index.ts`:

```ts
import demoConfig from './demo/store.config'
import demoTheme from './demo/theme.config'
// ...
export const STORE_REGISTRY: Record<string, StoreEntry> = {
  pipower: { config: pipowerConfig, theme: pipowerTheme },
  demo: { config: demoConfig, theme: demoTheme },
}
```

- [ ] **Step 3:** Run loader tests → PASS (el test de schemas valida demo automáticamente).
- [ ] **Step 4: Verificación manual:** `STORE_ID=demo pnpm dev` → la homepage muestra "Demo Store" y la paleta verde, **sin haber tocado código de app**. Anotar el resultado para el PR.
- [ ] **Step 5:** `pnpm typecheck && pnpm test` → verde. Commit: `feat(fase6): demo store — proves store-by-env without app changes`

### Task 7: ADR 0035

**Files:** Create: `docs/adr/0035-fase6-modelo-deploy-por-tienda.md`

- [ ] **Step 1:** Escribir el ADR con esta estructura y contenido (formato de los ADRs existentes):
  - **Contexto:** Fase 6 multi-tienda; codebase single-tenant; tema ya runtime; tiendas propias (2-5), terceros diferido.
  - **Decisión:** Modelo A — deploy-por-tienda sobre plantilla compartida. Una imagen/repo, N instancias diferenciadas por `STORE_ID` + DB propia. Registry síncrono `stores/`. Prod: `STORE_ID` obligatorio; dev/test default pipower. 1 proceso = 1 tienda.
  - **Alternativas:** B (app única + tenantId en cada tabla) — descartada: refactor masivo de ledger/pagos/search sin evidencia de escala. C (app compartida + DB por tienda) — graduación futura a ~10+ tiendas.
  - **Consecuencias:** costo sub-lineal vía Coolify multi-app por VPS; ops lineal en N (migraciones/deploys) aceptada a esta escala; venta a terceros requerirá capa de plataforma (fuera de Fase 6); las configs viajan en el bundle (prohibido poner secretos en `store.config.ts`).
- [ ] **Step 2:** Commit: `docs(adr): 0035 — Fase 6 modelo deploy-por-tienda`

### Task 8: CI, gate final y PR

**Files:** Modify: workflow de CI (localizar con `ls .github/workflows/`)

- [ ] **Step 1:** En el workflow, agregar `STORE_ID: pipower` al `env` de los jobs que corren `build` y `e2e` (build corre con NODE_ENV=production y el loader lo exige). Ejemplo:

```yaml
    env:
      STORE_ID: pipower
```

- [ ] **Step 2:** Gate completo local: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` → todo verde.
- [ ] **Step 3:** E2e: correr la suite Playwright como esté configurada en CI → verde **sin cambios en los specs**.
- [ ] **Step 4:** Verificaciones de aceptación: `git grep -c "@/store.config"` → 0. `STORE_ID=nope pnpm dev` → falla al boot con mensaje claro.
- [ ] **Step 5:** Push + abrir PR `feat(fase6): corte 0 — multi-store runtime via STORE_ID`. **NO mergear** — review en Cowork. La descripción incluye: resultados de los pre-req audits (Task 0), verificación manual de demo (Task 6), y **nota de rollout: setear `STORE_ID=pipower` en la env de Coolify ANTES de mergear** (inerte para el código viejo).

---

## Notas para el ejecutor

- TDD estricto en Tasks 2 y 6 (test primero, verlo fallar). Tasks 1/3/4/5 son refactors mecánicos protegidos por la suite existente.
- Cada tarea termina en commit con gate verde. Rojo → STOP y reportar.
- No tocar: `MAINTENANCE_MODE`, schema Prisma, adaptadores de pago/envío.
- Convención de módulos: `stores/` importa tipos/schemas de `modules/config`; nunca al revés.
