# ADR 0004 · Modelo de producto: SKU simple sin variantes

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

Fase 1 entrega catálogo B2B mayorista. Productos típicos del segmento (cosméticos, limpieza, papelería) suelen venderse en SKU empacado: una caja, un display, una paca. La idea de variantes (talla, color, sabor) existe pero el 90% del catálogo mayorista se modela como SKU único.

## Decisión

`Product` es atómico: 1 producto = 1 SKU = 1 precio base = 1 stock. No hay `ProductVariant` ni atributos. Cada presentación distinta (caja de 12 vs caja de 24) es un Product separado.

## Consecuencias

Positivas:
- Schema simple (Product + Category, sin variant tree).
- Pricing y stock por SKU son triviales y atómicos.
- Sin lógica condicional en cart/checkout para "qué variante".
- UX de catálogo cards/list mucho más limpia.

Negativas:
- Si un cliente necesita talla/color (improbable en mayorista), hay que agregar `ProductVariant` en una fase posterior con migración no trivial.
- Mitigación: si llega un cliente con esa necesidad, abrir ADR-N y diseñar antes de implementar.

## Alternativas descartadas

- **Variant tree completo** (Shopify-style): overhead enorme para 0% de casos en Fase 1.
- **JSON attributes en Product**: rompe tipado y dificulta queries.
