# ADR 0007 · tRPC + server actions: cuándo cada uno

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

Next.js 14 App Router ofrece dos primitivos para mutaciones desde la UI:
1. **Server actions** — funciones `'use server'` invocadas vía `<form action={fn}>`. Progressive enhancement nativo, sin JS funcionan.
2. **tRPC procedures** — clientes tipados sobre HTTP, ideales para queries client-side y reactividad.

Mezclar sin disciplina lleva a duplicación.

## Decisión

Regla:

- **Server actions** para mutaciones disparadas por formularios HTML (`<form>`). Especialmente: checkout multi-step, admin CRUD forms, switch org, impersonation start/stop, cart add/update/remove (forms).
- **tRPC** para:
  - Reads desde React Server Components donde queremos cache + tipado (catalog list, product detail, customer prices list).
  - Eventual reactividad client-side (futuro: live updates de stock, filtros dinámicos en catalog) sin recargar página.
- **Server-side service layer** (`modules/*/service.ts`) es la verdad. Ambas capas (server actions y tRPC routers) son thin wrappers que validan input + delegan a service.

Fase 1 usa principalmente RSC + server actions porque storefront es read-heavy y mutaciones son via forms. tRPC `/api/trpc` está expuesto para futuras integraciones client-side y dashboards admin.

## Consecuencias

Positivas:
- Sin JS, storefront funciona (forms HTML estándar).
- Tipado end-to-end donde importa.
- Service layer no duplica lógica entre canales.

Negativas:
- 2 capas que entender. Mitigación: regla simple (form → action; query/typed-client → tRPC).
- tRPC router subutilizado en Fase 1 — costo bajo (poco código, sin runtime overhead).

## Alternativas descartadas

- **Solo server actions**: pierde tipado client-side y dificulta futuras integraciones JS.
- **Solo tRPC**: rompe progressive enhancement y obliga a `useFormState`+`useFormStatus` boilerplate para todo.
