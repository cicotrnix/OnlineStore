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

## FU-003 — Corregir nombre de DB en runbook backup-restore

**Origen:** provisioning B2 backups (2026-06-09). **Cuándo:** con el próximo PR de CC (junto al de docs de launch), esta semana.

`docs/runbooks/backup-restore.md` usa `online_store` en los comandos `pg_dump`/`psql`/restore, pero la base real en producción es **`postgres`** (confirmado: el backup de `online_store` falló con "database does not exist"; el de `postgres` funcionó, 136 KB, a local + R2). Cambiar todas las refs `online_store` → `postgres` para que un restore futuro no falle. Tarea chica para CC.

## FU-004 — Probar restore de backup

**Origen:** provisioning B2 (2026-06-09). **Cuándo:** esta semana — idealmente antes del flip a público, o en los primeros días post-launch.

Bajar el .dmp más reciente (base `postgres`) y restaurarlo a una base descartable siguiendo `backup-restore.md` (ya corregido, FU-003). Verificar `/api/health` + un par de queries. Esto convierte "tengo backups" en "sé que sirven". No bloquea el launch pero es alta prioridad.

## FU-005 — Base de datos dedicada (higiene)

**Origen:** provisioning B2 (2026-06-09). **Cuándo:** post-launch, sin urgencia — en una ventana de mantenimiento o dentro de la ops de Fase 6.

Hoy la app corre sobre la base `postgres` (la default del contenedor). Lo prolijo sería una base dedicada (ej. `pipower`). Requiere reconfigurar `DATABASE_URL` + migrar datos, con downtime. No tocar antes del launch; evaluar como mantenimiento más adelante.

## FU-006 — i18n de emails transaccionales (email-subscriber)

**Origen:** review B6/PR #23 (2026-06-09). **Cuándo:** a decidir — gap de calidad para clientes en inglés; evaluar si pre-launch o post.

`modules/notifications/email-subscriber.ts` tiene los `title`/`body` de TODOS los emails transaccionales (order placed, payment captured, invoice issued, shipment, etc.) **hardcodeados en español**, sin patrón per-locale. Como el default de la tienda es `en-US`, un cliente angloparlante recibe emails en español. Pre-existente desde Fase 5 (no lo introdujo PR #23). Fix: mapear título/cuerpo por locale del destinatario (ya hay `User.preferredLocale` + helper `t()`), igual que los CTAs de los templates ya hacen. Es un barrido por los ~14 handlers del subscriber. USA es mercado primario → vale evaluarlo antes de abrir al público.

## FU-007 — Race en getOrCreateCart + consistencia de reads graceful

**Origen:** review PR #24 (2026-06-09). **Cuándo:** post-launch (bajo riesgo).

(a) `getOrCreateCart` tiene una posible race en concurrencia (dos add-to-cart simultáneos). Pre-existente; bajo riesgo en flujo de un usuario clickeando. Fix proper: upsert/constraint único o lock. El e2e de #24 lo evita pre-seedeando Cart.
(b) Los 3 reads "graceful" de org (`products/[slug]`, `search`, `api/ai/chat`) usan `?? null` en vez de `resolveActiveOrgId()` — un user con activeOrgId null pero una sola org podría no ver precio en el PDP. Edge raro ahora que el onboarding setea la org. Consistencia, no urgente.

## FU-008 — Refinamientos UI de password login

**Origen:** review PR #27 (2026-06-10). **Cuándo:** post-launch. Ninguno es bug ni riesgo de seguridad.

- **A. Refactor `SignInForm`:** creció con las dos formas (password + magic link toggle); limpiar.
- **B. Guard de `/account` para usuarios PENDING:** confirmar que un usuario recién registrado (org no verificada) puede gestionar su contraseña en `/account` sin quedar bloqueado por el guard. El más sustantivo de los 4 — verificar en el smoke.
- **C. Form de OTP sin `useFormState`:** usar el patrón consistente del resto.
- **D. Confirm-password client-only:** aceptable (el "confirmar" es anti-typo; el server guarda una sola contraseña). Documentado, no requiere cambio.

## FU-009 — IMEI / model lookup (batería compatible)

**Origen:** propuesta de impeccable en el design system (2026-06-10). **Cuándo:** mucho más adelante — feature extra post-rediseño/post-launch. Decisión de Herney: diferir.

Una cajita donde el cliente pone el **IMEI** (o el modelo) de su iPhone y la tienda le devuelve la **batería compatible**. Golazo de UX para el público de reparadores. Es una **feature nueva**, no un restyle: requiere mapear IMEI→modelo (el TAC, primeros dígitos del IMEI, codifica el dispositivo — tabla local o API de TAC lookup) → modelo→producto compatible (ya existe `compatibleModels` en el producto). Hacerla con su propio brainstorm → spec → plan cuando se priorice. NO incluir en el rediseño visual actual.

## FU-010 — Claims del hero: citar fuente formal del fabricante

**Origen:** restore del tag de capacidad (2026-06-13). **Cuándo:** cuando llegue la doc del fabricante.

Hero **+10% capacidad** — dato real de especificaciones de batería (restaurado en `app/_home-stats.ts` tras quitar el inventado +12% en 835c435). Pendiente: **citar fuente formal del fabricante** cuando llegue la doc. Al tenerla, **revisar 24–48h y demás claims contra esa doc** antes de restaurarlos en el hero/StatStrip (el `24–48h` sigue fuera por ahora). Regla del design system: nunca mostrar dato sin fuente.
