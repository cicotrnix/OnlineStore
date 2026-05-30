# ADR 0021 — Product attributes stored as JSON (not EAV)

Date: 2026-05-30
Status: Accepted (Fase 4 Fundación)

## Context

Fase 4 requires structured technical attributes per product (capacity_mah, voltage_v, cycles_rated, apple_model_code, flex_included, hazmat_class, etc.) to feed:

- The AI content generator (guardrail: it must use only provided attributes, never invent).
- The chatbot's compatibility checker (tool-use).
- Future faceted filters that go beyond category/price/stock.

Three storage options:

- **A. JSON column** (`Product.attributes Json?`) — one field, schema-on-read.
- **B. Entity-Attribute-Value table** — `ProductAttribute (productId, key, value)` rows.
- **C. Typed columns** — one column per attribute (`capacity_mah Int?`, `voltage_v Decimal?`, ...).

## Decision

Option A: `Product.attributes Json?`. JSON liviano, no EAV.

`Product.compatibleModels String[]` is its own field (not inside `attributes`) because it's the canonical source for chatbot compatibility lookups (see §14.9 of the spec); `attributes.apple_model_code` exists only for SEO/cross-reference.

## Consequences

Positive:
- Una sola migración para Fase 4; agregar atributos nuevos no requiere migration.
- 12 productos hoy → YAGNI sobre EAV o columnas tipadas. Si llegamos a 10k SKUs con búsqueda por atributo, podemos promover los más usados a columnas tipadas sin perder los menos comunes.
- JSON casa bien con el flujo "carga atributos en bulk vía loader" (`scripts/load-pipower-catalog.ts`).
- Prisma `Json?` cliente ya devuelve `Prisma.JsonValue` con narrowing aceptable.

Negative:
- No type-safety en runtime sobre las claves: typo en `cycles_rated` no se detecta hasta que el consumidor lo lea. **Mitigación**: el prompt-builder (Corte 1) y la herramienta del chatbot (Corte 2) deben usar Zod para validar la forma del JSON antes de usarlo. Documentar las claves esperadas en un type/schema TypeScript compartido.
- Queries que filtran por atributo (`WHERE attributes->>'capacity_mah' > '4000'`) son posibles en Postgres pero más lentas que columnas tipadas. Aceptable a esta escala.
- No EAV = no podemos hacer "lista todos los atributos distintos del catálogo" sin parsear cada JSON. Si necesitamos esa vista (admin facet builder), lo hacemos en código, no en SQL.

## References

- `prisma/schema.prisma` — `Product.attributes`, `Product.compatibleModels`
- Migración: `prisma/migrations/<ts>_product_content_attributes/migration.sql`
- Spec: `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §4.2, §14.9
