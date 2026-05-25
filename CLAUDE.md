# Briefing para Claude Code CLI

> Este archivo es el contexto que necesita Claude Code CLI al arrancar en este repositorio.
> Leerlo siempre antes de cualquier sesión. No editar sin actualizar también `ROADMAP.md`.

## Qué es este proyecto

**Online Store** — tienda B2B mayorista con IA, construida como **plantilla configurable multi-tenant** para operar en USA + Latinoamérica en USD. El objetivo del proyecto no es una tienda específica: es un producto-plataforma que permite lanzar nuevas tiendas mayoristas editando configuración, tema y catálogo, sin reescribir código.

## Workflow del owner (Herney)

- **Planificación, brainstorming y revisión** ocurren en **Cowork** (claude.ai desktop, modo Cowork).
- **Implementación, código, comandos, git, deploy** ocurren aquí en **Claude Code CLI**.
- Si Claude Code CLI tiene dudas estratégicas o de diseño, dejarlas claras en un comentario o en un commit, y Herney las resolverá en Cowork. No tomar decisiones grandes de arquitectura sin consultar.

## Lectura obligatoria al iniciar sesión

Antes de tocar código, leer en este orden:

1. `ROADMAP.md` (raíz) — visión completa de las 7 fases, arquitectura, stack, estado actual.
2. `docs/specs/<fase-actual>.md` — spec de la fase en curso.
3. `docs/plans/<fase-actual>-plan.md` — plan de implementación paso a paso de la fase actual.
4. `docs/adr/` — ADRs vigentes con decisiones de arquitectura.

## Estado actual del proyecto

**Fase 0 — Fundación · En implementación.**

Spec aprobado en `docs/specs/2026-05-25-fase-0-fundacion.md`.
Plan paso a paso en `docs/plans/2026-05-25-fase-0-fundacion-plan.md` — 40 tasks organizados en 11 partes.

**Lo que ya existe en el repo (creado en sesión Cowork del 2026-05-25):**

- Estructura base de Next.js 14 (`app/`, `package.json`, `tsconfig.json`, `next.config.mjs`).
- Tailwind + PostCSS configurado (`tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`).
- Biome para lint+format (`biome.json`).
- Sistema de configuración con Zod (`modules/config/`, `store.config.ts`, `theme.config.ts`).
- Helper `lib/theme/apply.ts` para CSS variables.
- `.env.example` con todas las variables documentadas.
- `.gitignore` adecuado.
- `README.md` con quick start.

**Pendiente en Fase 0** (continuar desde `docs/plans/2026-05-25-fase-0-fundacion-plan.md`):

- Parte 1 Task 5 en adelante: Vitest, Playwright.
- Parte 2 completa: Docker Compose para Postgres local, Prisma, schema inicial.
- Parte 3 Task 10: tests del módulo config (TDD).
- Parte 4 completa: Auth.js v5 con Resend magic links.
- Parte 5 completa: módulo customers con TDD (organizations, members, invitations).
- Parte 6 completa: páginas admin y flujos de invitación.
- Parte 7 completa: Pino logger y Sentry.
- Parte 8: CI con GitHub Actions.
- Parte 9: VPS Hetzner CX22 + Coolify (requiere acción del usuario al final).
- Parte 10: runbooks y ADRs.
- Parte 11: validación de criterios de aceptación.

**Limpieza pendiente del usuario en local:**
- `rm -f _tmp_* next.config.ts.bak` (artefactos de la sesión Cowork por permisos de sandbox).
- `pnpm install` para instalar deps.
- `cp .env.example .env.local` y rellenar con valores reales.
- Configurar git remote: `git remote add origin https://github.com/pipowerweb/OnlineStore.git`.

## Decisiones de stack (no abrir sin ADR nuevo)

- TypeScript estricto (`noUncheckedIndexedAccess: true`).
- Next.js 14 (App Router, single app — NO monorepo hasta Fase 6).
- Tailwind + shadcn/ui (instalar shadcn cuando se necesite).
- tRPC para API tipado end-to-end.
- Prisma + PostgreSQL 16 con extensión pgvector.
- Auth.js v5 con Resend para magic links. Modelo de organizaciones B2B propio (no Clerk).
- Hosting: Hetzner VPS CX22 ($6/mes, Ashburn USA East) + Coolify open-source.
- Email: Resend.
- Observabilidad: Sentry + Pino + (futuro) Uptime Kuma externo.
- Linting: Biome (NO ESLint+Prettier).
- Testing: Vitest (unit), Playwright (e2e).

Más detalle en `docs/adr/` cuando estén escritos.

## Convenciones de código

1. **TDD obligatorio** en módulos críticos: `modules/config`, `modules/customers`, futuros `modules/checkout`, `modules/pricing`, `modules/orders`. Test primero, ver fallar, implementar mínimo, ver pasar, commit.
2. **Módulos cerrados:** cada carpeta en `modules/` expone API sólo vía su `index.ts`. Otros módulos importan desde `modules/<name>` (no desde `modules/<name>/service.ts`). Esto facilita el refactor a packages en Fase 6.
3. **Imports:** usar alias `@/*` (root). Type-only imports con `import type`.
4. **Commits pequeños:** un commit por sub-task funcional. Conventional Commits (`feat:`, `chore:`, `fix:`, `docs:`, `test:`).
5. **No introducir alternativas al stack** (ej: Drizzle en lugar de Prisma) sin ADR.
6. **Sin warnings críticos** en `pnpm build`. CI bloquea el merge si lint, typecheck o tests fallan.
7. **WCAG 2.1 AA obligatorio** en cualquier pantalla nueva del storefront/admin.

## UI — dirección híbrida

Storefront tiene dos vistas:
- **Vista A — cards (default):** descubrimiento, mobile, compradores nuevos.
- **Vista B — lista densa (toggle):** re-orden, compras grandes, CSV upload.

El toggle persiste por usuario y por organización. Misma data, dos UX. NO hacer dos implementaciones separadas: un solo componente que renderiza según el modo activo.

## Cómo cerrar una fase

1. Verificar uno a uno los criterios de aceptación del spec.
2. Correr `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — todo verde.
3. Actualizar la tabla "Estado del proyecto" en `ROADMAP.md`.
4. Tag de release: `v0.<fase>.0`.
5. Notificar a Herney en Cowork: "Fase X cerrada, lista para revisión y brainstorming de Fase X+1".

## Cuando consultar a Herney en Cowork

- Decisión de arquitectura nueva no cubierta por ADRs existentes.
- Diseño visual de cualquier pantalla nueva (mockup antes de implementar).
- Cambios al stack o introducción de dependencias mayores.
- Cualquier ambigüedad en el spec actual.

## Memoria persistente del proyecto

La memoria Anthropic guarda contexto entre sesiones de Cowork. Para Claude Code CLI, este archivo (`CLAUDE.md`) es el reemplazo equivalente. Mantenerlo actualizado al cerrar cada fase y al introducir decisiones nuevas.
