# Backlog / follow-ups

> Items diferidos (fuera del alcance del PR/fase en curso). Cada uno: contexto, por qué se difirió, y qué decisión falta. Mover a un spec/plan cuando se priorice.

## FU-001 — Redesign generación de contenido AI por locale (PDP admin)

**Origen:** review PR #17 (2026-06-06). **Estado:** abierto, necesita decisión de UX.

Hoy `app/admin/products/[id]/page.tsx` tiene **un solo botón** "Generar / Regenerar (EN + ES)" (`enqueueContentGenAction`, sólo `productId`) que encola generación para **todos los locales a la vez**, sin importar si cada locale ya tiene contenido (DRAFT/PUBLISHED) o no. Por eso el label es combinado y no hay un booleano `isNew` para ramificar entre "Generar" y "Regenerar".

**Por qué se difirió:** separar en `admin.action.generate` / `admin.action.regenerate` no es un cambio de i18n — requiere rediseñar el control (per-locale), lo cual es behavior change y quedó fuera del fix de labels.

**Decisión de UX pendiente (resolver en Cowork antes de specear):**
- ¿Un botón por locale (Generar EN / Generar ES), con label que cambie a "Regenerar" según el estado del locale?
- ¿O un solo control con dropdown de locales + estado por locale?
- El status por locale ya se muestra (Badge DRAFT/PUBLISHED/—). ¿La acción vive junto a cada badge?
- Texto del botón depende del estado: `c ? regenerate : generate` por locale.

**Alcance técnico estimado:** UI del bloque "Contenido AI" + posible cambio de firma de `enqueueContentGenAction` para aceptar `locale` opcional. Sin cambios de schema. Agregar keys `admin.action.generate` / `admin.action.regenerate` cuando exista el ternario real.

## FU-002 — i18n completo del body text del admin

**Origen:** review PR #17 (2026-06-06). **Estado:** abierto.

El PR #17 (feedback + i18n) tradujo el storefront al 100% y, en este fix pre-merge, los labels de `SubmitButton` del admin. Pero el **resto del texto del admin** (headings, descripciones, labels de columnas) sigue hardcodeado — ej. `<h2>Contenido AI</h2>`, párrafos descriptivos, etc. El admin nunca se i18n'ó por completo.

**Por qué se difirió:** el fix pre-merge se acotó a `SubmitButton` (children/pendingLabel/confirmMessage) para no inflar el PR. El admin es interno (platform admin), no afecta clientes.

**Decisión pendiente:** ¿se i18n'a el admin entero, o se deja en un solo idioma de operación? Si se hace, es un barrido por `app/admin/**` extendiendo el namespace de keys. No bloquea go-live (cliente no ve admin).
