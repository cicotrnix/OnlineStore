# ADR 0005 · Pricing: lista base + override por cliente

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

Precios B2B mayorista típicos: lista base, con descuentos negociados por cliente (org) para SKUs específicos. No volume tiers ni reglas dinámicas en Fase 1 (esos van a Fase 2).

## Decisión

Dos tablas:

- `Product.basePrice` (Decimal 12,2) — precio de catálogo público.
- `CustomerPrice(organizationId, productId, price, validFrom?, validUntil?)` — override por (org, producto).

Resolución (`pricingService.resolveForOrg`):
1. Si existe `CustomerPrice` activa (`validFrom` ≤ now ≤ `validUntil`) para `(orgId, productId)` → usa esa price.
2. Si no → usa `Product.basePrice`.

Predecible, sin sorpresas. Sin tiers ni reglas escalonadas.

## Consecuencias

Positivas:
- Trivial razonar precio actual de un (org, producto).
- Snapshot al agregar al cart preserva precio fijado.
- Re-validación en `checkout.review` detecta drift.

Negativas:
- Sin descuentos por volumen → Fase 2.
- Sin cupones → Fase 2+.
- Una sola price activa por (org, producto) — no múltiples por canal.

## Alternativas descartadas

- **Pricing rules engine** (drools-like): overkill, debuggear pesadilla.
- **Lista de precios por canal/segmento**: añade dimensión sin caso de uso real Fase 1.
