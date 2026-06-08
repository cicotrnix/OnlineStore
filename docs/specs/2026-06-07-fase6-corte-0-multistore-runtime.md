# Spec — Fase 6 · Corte 0: Fundación multi-store en runtime (`STORE_ID`)

> Estado: aprobada en brainstorming Cowork (2026-06-07). Pendiente: plan de implementación.
> Modelo de Fase 6 decidido: **Modelo A — deploy-por-tienda sobre plantilla compartida** (ver §2). Tiendas propias de Herney; venta a terceros diferida.

## 1. Contexto

Hoy el codebase es single-tenant puro: una tienda = un deploy = una DB = un `store.config.ts` estático en la raíz, referenciado en ~40 archivos. El tema ya se aplica en **runtime** (`theme.config.ts` → `lib/theme/apply.ts#themeToCssVars` → CSS custom properties; Tailwind mapea `var(--color-*)`), lo cual habilita servir distintas tiendas sin rebuild de código.

Fase 6 convierte esto en **una plantilla, muchas instancias**: cada tienda es una instancia aislada (config + tema + DB propios) corriendo el mismo código, diferenciada por la env `STORE_ID`. No se forkea código por tienda: un fix se hace una vez y se redeploya a todas.

## 2. Decisión de arquitectura (Modelo A) — escribir ADR 0035 en este corte

- **A (elegido): deploy-por-tienda.** N instancias del mismo código (misma imagen o mismo repo buildeado por app de Coolify), cada una con su `STORE_ID` + su DB. Aislamiento por infraestructura. Menor refactor (el código ya es single-tenant). Coolify hostea varias tiendas por VPS → costo sub-lineal.
- **B (descartado por ahora): app única + `tenantId`.** Refactor masivo (cada tabla/query/módulo, ledger append-only, pagos, search) sin evidencia de escala. Trampa de abstracción-sin-evidencia.
- **C (graduación futura): app compartida + DB-por-tienda.** Se evalúa a ~10+ tiendas o si la ops de N deploys duele.
- Venta a terceros (SaaS/llave-en-mano): **fuera de Fase 6**. No construir billing/self-service/aislamiento estricto ahora.

El ADR 0035 documenta esta decisión con los trade-offs.

## 3. Objetivo del corte

La app bootea como **cualquier tienda** según `STORE_ID`, con pipower como default, sin regresión alguna del deploy actual. Es el enabler de los cortes 1–3.

## 4. Alcance / No-alcance

**Pre-requisitos obligatorios (antes de mover nada):**
- (a) **Audit de secretos** línea por línea de `store.config.ts` + `theme.config.ts`: las configs viajan en el bundle JS, así que cero tokens/keys. Si aparece un secreto → se mueve a env var, no al config.
- (b) **Audit build-time:** `next.config`, `tailwind.config` e instrumentation no deben leer store config en build. Si alguna lectura existe → eliminarla, o `STORE_ID` pasa a build-arg en Coolify (viable: Coolify ya buildea por app).

**Incluye:**
- Directorio `stores/` con `stores/pipower/store.config.ts` + `stores/pipower/theme.config.ts` (migrados desde la raíz; los archivos raíz se eliminan).
- Registry síncrono + loaders `getStoreConfig()` / `getStoreTheme()` en `stores/index.ts` (importables como `@/stores`).
- Migración de todos los call sites.
- ADR 0035.

**No incluye (cortes siguientes):**
- DB/`DATABASE_URL` por tienda y patrón de deploy Coolify (Corte 1).
- CLI `scaffold-nueva-tienda` (Corte 2).
- Panel central de tiendas (Corte 3).
- Monorepo / extracción a `packages/` (Corte 4, diferible).
- Cambios de schema Prisma: **ninguno**.

## 5. Diseño técnico

### 5.1 Estructura

```
stores/
  index.ts            ← registry: imports estáticos de cada tienda
  pipower/
    store.config.ts   ← el actual, movido
    theme.config.ts   ← el actual, movido
```

### 5.2 Registry síncrono + loaders

- `stores/index.ts` arma `STORE_REGISTRY: Record<string, { config: StoreConfig; theme: ThemeConfig }>` con imports estáticos y **exporta los loaders** `getStoreConfig(): StoreConfig` y `getStoreTheme(): ThemeConfig`. Los call sites importan de `@/stores`. `modules/config` queda puro (schemas + `defineStoreConfig`/`defineTheme`) — así no se invierte la dependencia módulo→app (dirección: `stores/` importa tipos/schemas de `modules/config`, nunca al revés).
- Todas las configs viajan en el bundle (data chica, sin secretos).
- **Resolución de `STORE_ID`:** en **producción es obligatorio** — ausente → throw al boot con mensaje claro. En development/test, default `'pipower'` (DX local). ID desconocido → throw siempre. Nunca fallback silencioso a otra tienda en prod.
- **Cache por proceso:** el loader resuelve una vez y cachea. Asunción documentada del Modelo A: **1 proceso = 1 tienda** (cada app de Coolify corre una sola tienda).
- **Contrato de `_setRegistry(registry | null)`:** reemplaza el registry **e invalida el cache** del loader; `null` restaura el registry real. Tests resetean en `afterEach` (mismo contrato que `_setStorageClient` en `lib/storage`).
- **Sincrónicos** — reemplazan 1:1 al import estático, incluso en module scope (`lib/auth/config.ts`, `lib/features.ts`, `lib/email/resend.ts`, `modules/ai/*`).
- Resultado cacheado en módulo (mismo patrón selector que `lib/storage`/`lib/stripe`).
- Hook de test `_setRegistry()` siguiendo la convención `_setX` existente.

### 5.3 Tema runtime

Root layout pasa de importar `theme.config.ts` a `themeToCssVars(getStoreTheme())`. Tailwind no cambia (ya consume `var(--color-*)`). Tienda nueva = otra paleta sin rebuild de código.

### 5.4 Migración de call sites

Los ~30 `import storeConfig from '@/store.config'` migran a `getStoreConfig()`. Al eliminar el archivo raíz, **cualquier import residual rompe `pnpm typecheck`** — la completitud de la migración la garantiza el compilador.

### 5.5 Client components

Componentes `'use client'` no importan config: reciben los valores por **props desde el server component** (patrón existente de `SignInForm`). Verificar en implementación cuáles de `FeaturedGrid`, `SearchResults`, `RelatedProducts` (y otros) son client y ajustar. Si algo client-side necesita el id de tienda (tagging de analytics/Sentry), también va **por props** — prohibido `NEXT_PUBLIC_STORE_ID` (duplicaría la fuente de verdad).

## 6. Edge cases y compatibilidad

- **SSG/ISR:** el contrato es config-por-env. Coolify buildea cada app con su env → páginas estáticas hornean la tienda correcta. "Imagen única compartida entre apps" queda como optimización futura, no requisito del corte.
- **`next.config`:** no debe leer store config (verificar; si lo hace, mover esa lectura).
- **`STORE_ID` inválido (o ausente en producción):** fallo claro al boot.
- **Rollout sin downtime:** setear `STORE_ID=pipower` en la env de Coolify **antes** de mergear el corte (la env es inerte para el código viejo). El default a `pipower` existe solo en development/test.

## 7. Testing (TDD obligatorio — el loader de tiendas es código crítico)

- Unit del loader: (a) sin env → pipower; (b) `STORE_ID` válido → config de esa tienda; (c) inválido → throw con mensaje claro; (d) **cada entrada del registry valida contra `storeConfigSchema`/`themeConfigSchema`** — una tienda mal configurada rompe CI, no producción.
- `_setRegistry()` para inyectar tiendas de prueba sin depender de tiendas reales (contrato §5.2: invalida cache, reset en `afterEach`).
- Smoke de tema: el root layout aplica `themeToCssVars(getStoreTheme())` — aserción de que las CSS vars de la tienda activa están en el HTML renderizado.
- E2e: la suite existente corre **sin cambios** (dev/test defaultea a pipower) y queda verde — prueba de regresión cero.

## 8. Criterios de aceptación

1. En dev/test sin env, o con `STORE_ID=pipower` → tienda idéntica a hoy; e2e existente verde sin modificaciones.
2. Una tienda dummy agregada en `stores/` + su `STORE_ID` se sirve con su identidad y tema **sin tocar código de app**.
3. Cero referencias a `@/store.config` (garantizado por typecheck tras eliminar el archivo raíz).
4. `STORE_ID` inválido —o ausente en producción— → fallo claro al boot.
5. ADR escrito en `docs/adr/0035-fase6-modelo-deploy-por-tienda.md`.
6. Pre-requisitos §4 cumplidos y documentados en el PR (audit de secretos + audit build-time).
6. Gate completo verde: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + e2e.

## 9. Desglose de Fase 6 (contexto)

| Corte | Contenido | Estado |
|---|---|---|
| **0** | Fundación multi-store runtime (`STORE_ID`) — esta spec | Spec aprobada |
| 1 | DB + deploy por tienda (segunda tienda real end-to-end) | Pendiente |
| 2 | CLI `scaffold-nueva-tienda` | Pendiente |
| 3 | Panel central de tiendas | Pendiente |
| 4 | Monorepo / `packages/` | Diferible — cuando duela |
| — | Capa terceros/SaaS (billing, self-service) | Fuera de Fase 6 |
