# ADR 0001 · Single Next.js app en lugar de monorepo Turborepo

- Status: Aceptado
- Fecha: 2026-05-25

## Contexto

La plantilla apunta a ser multi-tenant con paquetes compartidos en Fase 6 (multi-tenant + design tokens packageables). Una opción era arrancar directamente con Turborepo + workspaces. La otra, single Next.js app y refactorizar a monorepo cuando haga falta.

## Decisión

Arrancar con single Next.js app. Organizar internamente en `modules/<dominio>/` con un `index.ts` por módulo como API pública. Esto deja la puerta abierta para extraer cada módulo a un package en Fase 6 sin reescribir.

## Consecuencias

Positivas:

- Velocidad de Fase 0 — sin overhead de Turborepo, workspaces ni build configs cruzados.
- Curva de aprendizaje menor para colaboradores nuevos.
- Un solo `pnpm install`, un solo `pnpm build`.

Negativas:

- Refactor a monorepo en Fase 6 será trabajo dedicado.
- Mitigación: disciplina estricta de importar siempre desde `modules/<name>` (nunca `modules/<name>/service`).
