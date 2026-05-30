# Spec — Fase 4: Capa de IA aplicada

- Fecha: 2026-05-30
- Owner: Herney
- Estado: **Borrador rev. 2** — brainstorming cerrado + revisión de código CC incorporada (§14)
- Fases previas: 0, 1, 2, 3 cerradas y en producción (búsqueda viva con catálogo real Pi-Power)

---

## 1. Principio rector (no negociable)

La IA **nunca hardcodea el dominio "batería"**. El conocimiento de dominio entra como **datos/config**:

- **Voz de marca** desde `store.config.ts` (nuevo bloque `identity.brandVoice` + `ai`).
- **Specs de producto** desde atributos estructurados en la DB.
- **Catálogo** desde la DB vía los módulos existentes (`catalog`, `pricing`, `search`).

Prohibido: cualquier `if (producto.esBateria)` o prompt con "batería" clavado en el core. El motor sirve baterías hoy y cualquier vertical mañana cambiando datos, no código. Esto es lo que mantiene barata la extracción de la plantilla en Fase 6.

## 2. Decisiones (resueltas con recomendación — confirmar con owner)

Estas seis se decidieron por defecto en Cowork para no bloquear. Si alguna está mal, se ajusta antes de implementar:

1. **API key Anthropic:** se construye con patrón **noop fallback** (igual que Voyage/Resend/Meilisearch). Sin `ANTHROPIC_API_KEY` el build, tests y CI no se rompen; las features de IA quedan inertes hasta cargar la key en Coolify. → No bloquea desarrollo.
2. **Bilingüe EN/ES:** el almacenamiento y la generación son **bilingües desde el Corte 1** (es-419 + en-US). El storefront muestra el contenido del locale activo con **fallback a EN**. El switch de idioma visible en el storefront es un sub-task chico dentro del Corte 1.
3. **Aprobación de contenido:** **borrador → owner aprueba → publica**. Nada generado va directo a producción sin aprobación (replica el modelo de `copy-source.md` de PiPower).
4. **Chatbot:** funciona para **anónimos** (precio base) y **logueados** (precio de su organización + su catálogo). Más embudo, respetando reglas B2B.
5. **Imágenes:** se **importan las fotos master de PiPower** y se asignan por modelo. Las variantes "Tag-On Flex" comparten la imagen del modelo base.
6. **Lineup:** se trabaja sobre los **12 SKUs actuales** (`load-pipower-catalog.ts`). Specs se mapean por modelo desde PiPower; los modelos/variantes sin spec quedan con atributos en `null` para que el owner los complete. (PiPower tenía iPhone 11/12 que no están en el lineup actual; el lineup actual tiene variantes "Tag-On Flex" sin spec directo.)

## 3. Arquitectura general

Cuatro sub-módulos bajo `modules/ai/`, todos detrás del `AIProvider`:

```
modules/ai/
  provider/        # AIProvider: wrapper Anthropic SDK + noop fallback + logging + rate-limit
  content/         # Corte 1 — generación de contenido bilingüe + SEO
  chat/            # Corte 2 — chatbot asistente de compatibilidad (tool-use)
  recommendations/ # Corte 3 — recos sobre pgvector (sin LLM en hot path)
```

Cada sub-módulo es cerrado (expone API solo vía su `index.ts`), como el resto del proyecto. Todas las llamadas a LLM son **server-side** (RSC / server actions / tRPC). `ANTHROPIC_API_KEY` nunca llega al cliente.

## 4. Fundación (prerrequisito de todos los cortes)

### 4.1 `AIProvider` (`modules/ai/provider`)

- Interfaz: `complete(prompt, opts)`, `stream(prompt, opts)`, `completeStructured(schema, prompt, opts)`.
- Backend: `@anthropic-ai/sdk`. Modelo configurable vía `store.config.ts` (`ai.model`).
- Noop fallback sin API key (no rompe build/tests/CI).
- Cross-cutting: logging de uso de tokens/costo (Pino), rate-limit por org (reusa `lib/rate-limit.ts`), system prompt base con voz de marca + reglas de seguridad.
- **ADR 0020** — abstracción AIProvider + elección de modelo.

### 4.2 Schema

- `Product.attributes Json?` — capacity_mah, voltage_v, cycles_rated, apple_model_code, flex_included, pre_programmed_flex_included, product_installation_type, requires_soldering, professional_installation_recommended, warranty_months, hazmat_class, requires_ground_shipping. **JSON liviano, no EAV** (12 productos → YAGNI). **ADR 0021.**
- `Product.compatibleModels String[]` — modelos de iPhone compatibles (alimenta el chatbot).
- `ProductContent` (nuevo) — clave `(productId, locale)`; campos `longDescriptionMd`, `shortDescription`, `seoTitle`, `seoDescription`, `status` (`draft`/`published`), timestamps. **ADR 0022** (almacenamiento de contenido multilingüe).
- `store.config.ts`: bloque `identity.brandVoice` (audiencia, tono, reglas) + bloque `ai` (model, locales, flags `aiContent`/`aiChat`/`aiRecommendations`).

### 4.3 Datos e imágenes

- Extender `load-pipower-catalog.ts`: llenar `attributes` + `compatibleModels` desde los specs reales de PiPower (capacidad, voltaje, ciclos, A-numbers, flex por línea iPhone 15).
- Importar las fotos master de PiPower al proyecto (`public/products/` o media) y asignar `imageUrl` por modelo.

## 5. Corte 1 — Generación de contenido (primero)

**Módulo:** `modules/ai/content`.

**Flujo:** admin dispara generación (un producto o masivo) → `buildContentPrompt({ brandVoice, attributes, name, category })` → `AIProvider` genera secciones markdown (Overview, Especificaciones, Instalación, Qué incluye, Seguridad, Envío, Garantía) + short description + SEO title/description, **en EN y ES** → se guarda en `ProductContent` como `draft` → owner revisa y aprueba → pasa a `published` → se re-encola para reindexar en search.

**Guardrail crítico:** la IA usa **solo** los atributos provistos. Si un spec falta, lo omite — **nunca lo inventa**. Con baterías la precisión técnica es seguridad.

**UI admin:** en `/admin/products/[id]`, botón "Generar contenido" + bulk "Generar todo"; vista previa por locale; aprobar/publicar; borrador vs publicado.

**Storefront:** el PDP renderiza el contenido `published` del locale activo (fallback EN). Switch de locale básico en el header.

**TDD:** prompt-builder (puro), parser de secciones, manejo de locale, transición draft→published.

**Criterios de aceptación:**
- [ ] Los 12 productos tienen `ProductContent` EN + ES generado y aprobable.
- [ ] La IA no inventa specs ausentes (test con producto de atributos parciales).
- [ ] Contenido publicado aparece en el PDP y mejora `searchableText` (reindex disparado).
- [ ] Sin `ANTHROPIC_API_KEY`, la generación cae a noop sin romper.
- [ ] Voz de marca aplicada (tono técnico, sin exclamaciones salvo CTA, sin emoji).

## 6. Corte 2 — Chatbot asistente de compatibilidad

**Módulo:** `modules/ai/chat`.

**Arquitectura por tool-use (function calling):** el LLM tiene herramientas acotadas — `searchProducts`, `getProductDetail`, `checkCompatibility` — que pegan al catálogo real. **No puede inventar productos ni specs**; solo responde con lo que las tools devuelven. **ADR 0023.**

**Matiz B2B:** las tools pasan por `pricing` y acceso/catálogo — logueado ve su precio negociado y solo su catálogo; anónimo ve precio base y catálogo público. Reusa `pricing`, `search`, `catalog`.

**UI:** widget flotante en el storefront, respuestas en streaming, rate-limited (reusa `lib/rate-limit.ts`), detrás del flag `aiChat`.

**Guardrails:** acotado al dominio de la tienda (no responde off-topic), no inventa, escala al email de soporte cuando no sabe. Input del usuario nunca es prompt libre con poder — solo alimenta tools.

**Criterios de aceptación:**
- [ ] "¿Qué batería para iPhone 14 Pro?" devuelve el SKU correcto con stock y precio correcto según sesión.
- [ ] Usuario logueado de una org ve su precio; anónimo ve base.
- [ ] No revela productos privados a orgs sin acceso.
- [ ] No inventa un producto inexistente (test con modelo fuera de catálogo → respuesta honesta + soporte).
- [ ] Rate-limit por IP/org activo.

## 7. Corte 3 — Recomendaciones

**Módulo:** `modules/ai/recommendations`. Mayormente **sin LLM**.

- "Productos relacionados" en PDP = vecinos más cercanos por embedding pgvector (coseno), filtrados por acceso.
- "Recomendado para ti" (logueado) = heurística sobre historial de órdenes + embeddings.
- LLM **fuera del hot path** (costo/latencia); opcional solo para el texto "por qué te lo recomendamos". **ADR 0024.**

**Criterios de aceptación:**
- [ ] PDP muestra 4–8 relacionados por similitud, respetando acceso.
- [ ] Logueado con historial ve recos personalizadas; anónimo ve relacionados por producto.
- [ ] Sin llamadas a LLM en el render del catálogo (latencia/costo controlados).

## 8. Transversales

- **Costo/rate-limit:** el contenido se genera una vez y se guarda (no por request); el chat va en streaming con límite por org; log de tokens vía Pino.
- **Feature flags:** `store.config.ts` gana `aiContent`, `aiRecommendations` (`aiChat` ya existe). Defaults OFF hasta cargar API key.
- **i18n:** EN/ES en contenido; switch básico de locale en storefront.
- **Observabilidad:** Sentry + Pino en cada llamada de IA; métricas de fallo y fallback noop.
- **Seguridad:** `ANTHROPIC_API_KEY` solo server-side; prompt-injection acotado por tool-use; sin datos de cliente en prompts más allá de lo necesario.
- **Testing:** TDD en prompt-builders, parsers, tool handlers y la lógica de pricing/acceso del chat. `AIProvider` mockeable (noop determinista) en tests.

## 9. ADRs a crear

- **0020** — Abstracción `AIProvider` + elección de modelo Anthropic (**split: Haiku para chat, Sonnet para content gen**; ver §14.10) + **excepción de estructura anidada** `modules/ai/<sub>/` vs convención `service.ts` (§14.3).
- **0021** — Atributos de producto en JSON (vs EAV).
- **0022** — Almacenamiento de contenido multilingüe (`ProductContent`).
- **0023** — Grounding del chatbot por tool-use (anti-alucinación).
- **0024** — Recomendaciones por pgvector (sin LLM en hot path).
- **0025** — Estrategia i18n EN/ES (cookie/preferencia vs routing `/[locale]`; ver §14.4).

## 10. Orden de construcción

1. **Fundación** — `AIProvider` + schema (`attributes`, `compatibleModels`, `ProductContent`) + `store.config` (brandVoice, ai) + extender loader con specs + importar imágenes.
2. **Corte 1** — generación de contenido (admin trigger + EN/ES + SEO + aprobación + storefront).
3. **Corte 2** — chatbot (tool-use + B2B pricing/acceso + widget).
4. **Corte 3** — recomendaciones (pgvector + personalización).

Cada corte: spec interno (este doc) → plan en `docs/plans/` → implementación con TDD → CI verde → commit. No se salta de corte hasta cerrar el anterior.

## 11. Criterios de cierre de Fase 4

- [ ] Fundación + 3 cortes entregados con sus criterios de aceptación verdes.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verde.
- [ ] ADRs 0020–0024 escritos.
- [ ] Runbooks de operación de IA (costo, rate-limit, troubleshooting).
- [ ] ROADMAP sección 9 actualizada; tag `v4.0.0`.

## 12. Fuera de alcance (explícito)

- **Moderación de reviews** — no existe módulo de reviews; construirlo solo para moderar no suma ahora. Se pospone.
- **Multi-tenant / extracción de plantilla** — es Fase 6. Aquí solo se respeta el principio dominio-como-datos para que esa extracción sea barata.
- **Precios de PiPower** — son retail B2C; el proyecto es mayorista B2B. Se ignoran.

## 13. Pendiente del owner (confirmar)

- Proveer `ANTHROPIC_API_KEY` (cuenta Anthropic de la tienda) y cargarla en Coolify cuando se active la IA.
- Vetar las 6 decisiones de §2.
- Confirmar que el lineup de 12 SKUs es el definitivo o indicar cambios.

## 14. Ajustes incorporados por revisión de código (CC, 2026-05-30)

CC revisó el spec contra el código real. Resolución de cada punto — **el plan debe seguir esto**:

1. **`aiChat` default.** CC reportó que `store.config.ts` lo tiene en `true`. **Verificado: es `false`** (línea 26). No hay nada que bajar; los flags de IA (`aiChat`, y los nuevos `aiContent`, `aiRecommendations`) quedan en `false` hasta cargar la key. Subir `aiChat` solo al cerrar el Corte 2.
2. **Zod schema cerrado.** Confirmado: `storeConfigSchema.identity` y `.modules` son objetos cerrados. Extender `modules/config/schemas.ts` (agregar `identity.brandVoice`, bloque `ai`, flags `aiContent`/`aiRecommendations`) **y actualizar `modules/config/schemas.test.ts`** es sub-task explícito de la Fundación.
3. **Estructura anidada.** `modules/ai/<sub>/` es excepción a la convención `service.ts`-por-módulo. Justificada por tamaño; documentar en **ADR 0020**.
4. **i18n NO es sub-task chico.** El "switch de locale" esconde una decisión real (routing `/[locale]/...` vs cookie/preferencia + RSC). Se trata como **Corte 0.5 (infra i18n)** entre Fundación y Corte 1, con **ADR 0025**. Recomendación (YAGNI): **cookie/preferencia de usuario**, no routing por path, salvo que SEO multi-idioma lo exija. Confirmar con owner.
5. **Cost budget + kill-switch (crítico, seguridad).** Una key comprometida factura miles. Agregar `AI_MONTHLY_TOKEN_BUDGET` (env) + contador de uso en DB + **kill-switch**: si se excede el presupuesto, el `AIProvider` corta y devuelve error en vez de seguir llamando. Va en la Fundación, no se aplaza.
6. **Generación masiva async.** 12 productos × 7 secciones × 2 locales = ~168 llamadas. Serial bloquea el admin; paralelo pega el rate-limit de Anthropic. **Modelo nuevo `AIContentJob`** (status PENDING/PROCESSING/DONE/FAILED) + worker cron, **reusando el patrón `SearchIndexQueue` de Fase 3**. La generación encola; no corre inline.
7. **Rate-limit propio para IA.** No basta reusar `lib/rate-limit.ts` tal cual; el LLM es más caro. Agregar presets nuevos: `AI_CHAT_LIMITS` (~5/min, 30/h por sesión) y `AI_CONTENT_GEN_LIMITS` (~10/h por admin).
8. **Dependencia operacional (no de spec).** El reindex post-publish llama `enqueueIndex(productId, 'UPSERT')`; eso solo surte efecto si el **scheduled task `process-search-index-queue` (1 min) está corriendo en Coolify**. Verificar que quedó activo antes de probar el Corte 1 end-to-end.
9. **`compatibleModels` es la fuente canónica** de compatibilidad (array, expresivo para variantes Tag-On que sirven varios modelos). `attributes.apple_model_code` queda solo para SEO/cross-reference, no para lógica de compatibilidad.
10. **Modelo por caso de uso (costo).** En ADR 0020: **Haiku 4.5 para el chat** (alta frecuencia, latencia importa) y **Sonnet 4.6 para content gen** (calidad importa, batch async). No usar Opus por default.
11. **`ProductContent` PK.** `id String @id @default(cuid())` + `@@unique([productId, locale])`.
12. **Imágenes.** Resuelto: usar el set `final-normalized` (~0.9 MB c/u, ~9 imágenes para el lineup → bien bajo 20 MB). **Optimizar a webp** antes de commitear a `public/products/` (Core Web Vitals). No subir los 3 sets, solo el necesario.
13. **Variantes Tag-On Flex.** Comparten imagen del modelo base → agregar badge "Tag-On Flex" en `ProductCard` para no confundir al comprador en `/catalog`.
14. **Tests de LLM.** Mockear `AIProvider` con fixtures determinísticos en `__tests__/fixtures/`. Documentar en el plan.
15. **"Owner" = platform admin** (`isPlatformAdmin = true`), NO el owner de una organización. Aplica al gate de aprobación de contenido.

**Veredicto de CC:** spec aprobable; resolver 1, 4, 5, 6, 10 antes de codear (hecho aquí, a nivel diseño); #8 es blocker operacional (cron Coolify), no de spec; el resto son refinamientos ya integrados.
