# Online Store

Tienda B2B mayorista con IA — plantilla configurable multi-tenant.

## Stack

Next.js 14 · TypeScript · Tailwind + shadcn/ui · Auth.js v5 · Prisma · PostgreSQL 16 · pgvector · Hetzner VPS + Coolify

## Quick start (local)

Prerrequisitos: Node 20+, pnpm 9+, Docker Desktop, Git.

```bash
git clone git@github.com:cicotrnix/OnlineStore.git
cd OnlineStore
pnpm install
cp .env.example .env.local
# Editar .env.local — generar NEXTAUTH_SECRET con: openssl rand -base64 32
docker compose up -d        # Postgres + pgvector en :5435
pnpm exec prisma migrate dev
pnpm dev
```

Abrir http://localhost:3000.

## Scripts

```bash
pnpm dev           # Servidor de desarrollo
pnpm build         # Build de producción
pnpm test          # Tests unitarios (Vitest)
pnpm test:e2e      # Tests E2E (Playwright)
pnpm lint          # Lint con Biome
pnpm format        # Format con Biome
pnpm typecheck     # TypeScript
pnpm db:migrate    # Migrar la DB (Prisma)
pnpm db:studio     # Abrir Prisma Studio
```

## Documentación

- [`ROADMAP.md`](ROADMAP.md) — Visión general del proyecto y las 7 fases
- [`docs/specs/`](docs/specs/) — Specs de diseño por fase
- [`docs/plans/`](docs/plans/) — Planes de implementación por fase
- [`docs/runbooks/`](docs/runbooks/) — Operación, deploy, mantenimiento
- [`docs/adr/`](docs/adr/) — Decisiones de arquitectura

## Configuración de la tienda

La tienda se configura desde dos archivos en la raíz, sin tocar código de aplicación:

- [`store.config.ts`](store.config.ts) — Identidad, locales, módulos activos, pagos, UI defaults
- [`theme.config.ts`](theme.config.ts) — Colores, tipografía, radios, densidad visual

## Estado

Fase 0 — Fundación · En implementación
