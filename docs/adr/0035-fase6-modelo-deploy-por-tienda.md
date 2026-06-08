# ADR 0035 — Fase 6: Modelo A · deploy-por-tienda sobre plantilla compartida

Fecha: 2026-06-07

## Estado

Aceptado. Implementado en Fase 6 Corte 0 (branch `feat/fase6-corte0-multistore-runtime`).

## Contexto

El codebase pre-Fase 6 es single-tenant puro: una tienda = un deploy = una DB = un `store.config.ts` estático en la raíz, referenciado en ~40 archivos. El tema ya se aplica en **runtime** (`themeToCssVars` → CSS custom properties), lo cual habilita servir distintas tiendas sin rebuild de código.

Fase 6 quiere "una plantilla, muchas tiendas": tiendas propias del owner (escala objetivo 2-5 instancias en el corto plazo). Venta a terceros (SaaS llave-en-mano) está **fuera del alcance** de esta fase.

## Decisión

**Modelo A — deploy-por-tienda sobre plantilla compartida.**

- Una imagen / un repo. N instancias diferenciadas por la env `STORE_ID` + DB propia.
- Registry síncrono en `stores/index.ts` con imports estáticos de cada `stores/<id>/store.config.ts` + `stores/<id>/theme.config.ts`.
- Loaders síncronos `getStoreConfig()` / `getStoreTheme()` que resuelven `STORE_ID` y cachean (asunción: 1 proceso = 1 tienda).
- **Producción:** `STORE_ID` obligatorio — fail-fast al boot si no está seteado (sin fallback silencioso).
- **Dev/test:** default `pipower` si `STORE_ID` no está seteado o es string vacío.
- Hosting: Coolify multi-app por VPS → costo sub-lineal.
- Migración de call sites garantizada por `pnpm typecheck` tras eliminar `store.config.ts` raíz (no quedan imports residuales).
- Aislamiento entre tiendas vía infraestructura (proceso + DB), no vía código.

## Alternativas consideradas

- **Modelo B — App única + `tenantId` por tabla.** Descartado. Refactor masivo de ledger append-only, pagos, search y ~40 archivos sin evidencia de escala. Trampa de abstracción-sin-evidencia.
- **Modelo C — App compartida + DB-por-tienda.** Graduación futura (~10+ tiendas o cuando la ops de N deploys duela). No se construye ahora.
- **Capa terceros / SaaS** (billing, self-service, aislamiento estricto). Fuera de Fase 6. Requeriría plataforma adicional encima de Modelo C.

## Consecuencias

**Positivas:**
- Refactor mínimo: el código ya era single-tenant; solo cambia la fuente de `store.config`/`theme.config`.
- Aislamiento fuerte por proceso + DB: un bug en una tienda no contamina otra.
- Un fix se redeploya N veces, no se forkea por tienda.
- Tema runtime ya existente → tienda nueva = otra paleta sin rebuild de código.

**Negativas / costos aceptados:**
- Ops lineal en N: cada deploy corre sus migraciones, monitoreo, secretos.
- Las configs de todas las tiendas viajan en el bundle JS (data pequeña, sin secretos).
  - **Restricción dura:** `stores/<id>/store.config.ts` no puede contener tokens, keys ni URLs con credenciales. Esas viven en env vars del deploy.

**Graduación:**
- Cuando aparezcan ~10+ tiendas o la ops de N deploys duela, evaluar Modelo C.
- Si surge venta a terceros, el camino es: Modelo C → capa de plataforma encima.

## Referencias

- Spec: `docs/specs/2026-06-07-fase6-corte-0-multistore-runtime.md`
- Plan: `docs/plans/2026-06-07-fase6-corte-0-multistore-runtime-plan.md`
