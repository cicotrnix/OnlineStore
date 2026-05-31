# ADR 0022 — Multilingual product content via `ProductContent` (one row per locale)

Date: 2026-05-30
Status: Accepted (Fase 4 Fundación)

## Context

Fase 4 Corte 1 generates AI-written product content in **EN + ES** for each product. The content includes long markdown description, short description, SEO title, SEO meta description, and lifecycle state (`DRAFT` vs `PUBLISHED`). We need a storage model that:

- Scales to N locales (today 2; future-proof for more).
- Keeps the `Product` row free of locale-specific noise.
- Allows independent draft/publish per locale (es-419 puede estar publicado mientras en-US sigue en draft).
- Casa con el chequeo "owner aprueba antes de publicar" (spec §2.3).

## Decision

Modelo dedicado `ProductContent`:

```prisma
model ProductContent {
  id                String               @id @default(cuid())
  productId         String
  locale            String               // 'en-US', 'es-419', ...
  longDescriptionMd String?              @db.Text
  shortDescription  String?
  seoTitle          String?
  seoDescription    String?
  status            ProductContentStatus @default(DRAFT)
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([productId])
}

enum ProductContentStatus { DRAFT  PUBLISHED }
```

- PK propia (`id`) para joins y cache invalidation.
- `@@unique([productId, locale])` garantiza una sola fila por par.
- `onDelete: Cascade` desde Product limpia automáticamente.
- Status binario por locale — un producto puede tener EN publicado y ES en draft simultáneamente.

## Consequences

Positive:
- N locales sin tocar schema: insertás una fila más.
- El PDP renderea el `published` del locale activo con fallback EN, sin JOINs raros.
- Aprobación por locale (owner = `isPlatformAdmin=true`, spec §14.15) opera a nivel fila.
- El loader (`scripts/load-pipower-catalog.ts`) y la regeneración masiva (cola `AiContentJob` por `productId+locale`) operan sobre la misma PK lógica.
- Cuando se publica un locale, el handler dispara `enqueueIndex(productId, 'UPSERT')` para que Meilisearch reciba el nuevo `searchableText` que incluye el contenido publicado.

Negative:
- Lectura del PDP requiere un query adicional al menos (`findFirst` por productId+locale con fallback). Cacheable.
- No hay relación entre traducciones (EN y ES son filas independientes). Si un atributo cambia, hay que re-generar AMBOS. **Mitigación**: el botón "Generar contenido" del admin debe encolar `(productId, en-US)` y `(productId, es-419)` juntos.
- El status binario `DRAFT`/`PUBLISHED` no contempla `IN_REVIEW`. Si el flow de aprobación se vuelve multi-paso, agregar un estado. Por ahora YAGNI.

## References

- `prisma/schema.prisma` — `ProductContent`, `ProductContentStatus`
- Migración: `prisma/migrations/<ts>_product_content_attributes/migration.sql`
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §4.2, §14.11, §14.15
