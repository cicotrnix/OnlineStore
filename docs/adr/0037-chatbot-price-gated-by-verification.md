# ADR 0037 — Chatbot público con precio gateado por verificación

Fecha: 2026-06-13

## Estado

Aceptado. Resuelve ARQ-1 / AI-1 (P1) de la auditoría `docs/audit/2026-06-12-audit.md`. Decidido por Herney en Cowork (`docs/plans/2026-06-13-decisiones-tensiones-1-2-3.md`, Decisión 2). Hace cumplir ADR 0034 al pie.

## Contexto

El storefront esconde el precio mayorista tras login + verificación (ADR 0034: "no muestran precio para anónimos ni para orgs pending/rejected. Sólo orgs VERIFIED ven precio"). La PDP y el catálogo lo cumplen vía `showPrice = customerState.kind === 'verified'`. Pero el chatbot (escrito en Fase 4, anterior a ADR 0034) quedó fuera del barrido: sus tres tools devolvían `priceResolved` siempre — `basePrice` para anónimos y precio resuelto para cualquier org con sesión, sin chequear `verificationStatus`. Un competidor anónimo podía abrir el widget y extraer la lista de precios completa. El test `tools.test.ts` incluso codificaba el leak (`priceResolved` truthy con `orgId: null`).

## Decisión

**El chat sigue público (anónimos pueden usarlo), pero el precio se gatea por verificación, espejo exacto de la PDP.**

- Las 3 tools (`searchProducts`, `getProductDetail`, `checkCompatibility`) resuelven el precio vía `priceFieldsFor(orgId, productId)`, que llama `isVerified(orgId)` (mismo patrón que `cartService.addItem` y `checkout.confirm`).
  - Org `VERIFIED` → `{ priceVisible: true, priceResolved }` (y `basePrice` solo en `getProductDetail`).
  - Anónimo / `PENDING` / `REJECTED` → `{ priceVisible: false }`, sin ningún número de precio.
- La **visibilidad** de productos (`filterForOrg` / `filterAccessibleIds`) ya era correcta y **no se tocó** — solo se gatea el precio.
- El system prompt instruye al modelo: si `priceVisible=false`, no enunciar precio; invitar a iniciar sesión y verificarse (equivalente conversacional de `loginForPrice`).

## Consecuencias

- **Positivas:** el precio mayorista deja de filtrarse a competidores; el chat conserva su valor de descubrimiento (specs, compatibilidad, stock) para anónimos; coherencia total con la política de la PDP y ADR 0034.
- **Neutro:** el endpoint `/api/ai/chat` sigue aceptando anónimos (decisión explícita: chat público). El rate-limit por IP sigue siendo la única protección de abuso de uso (ver tensión #4 de la auditoría, sin cambios aquí).

## Evidencia / verificación

- `modules/ai/chat/__tests__/tools.test.ts`: anónimo y org PENDING → `priceVisible:false`, sin `priceResolved`/`basePrice`; org VERIFIED con CustomerPrice → `priceResolved` 7.5 + `priceVisible:true`. El test que codificaba el leak fue corregido.
