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
pnpm db:seed                # Demo: admin@example.com, Acme Wholesale, 6 productos
pnpm dev
```

Abrir http://localhost:3000. Iniciar sesión con magic link a `admin@example.com` (revisar logs si no hay Resend configurado).

## Cómo usar el storefront

- **Catálogo** (`/catalog`): toggle Cards/Lista persiste por usuario. Filtros por categoría.
- **Producto** (`/products/[slug]`): ficha individual. Si tu org tiene precio negociado, aparece como "Tu precio" con badge.
- **Carrito** (`/cart`): persistente por usuario. Item desactivado se marca pero no bloquea cart; bloquea checkout.
- **Checkout** (`/checkout`): wizard de 4 pasos — revisar, direcciones, PO+notas, confirmar. Reserva stock atómicamente.
- **Tus órdenes** (`/orders`): historial de la org activa.

## Admin panel

`/admin` (solo `User.isPlatformAdmin = true`):

- `/admin/products` — CRUD productos, activar/desactivar.
- `/admin/categories` — CRUD categorías.
- `/admin/orders` — listado + detalle con transiciones de estado y cancelación (restaura stock).
- `/admin/customers` — listado de orgs cliente.
- `/admin/customers/[id]` — detalle: miembros, direcciones, link a precios, botón impersonation.
- `/admin/customers/[id]/prices` — gestión de precios override por org.

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
pnpm db:seed       # Cargar datos demo (admin, org, productos, precios)
pnpm db:reset      # Reset + migrate + seed
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

Fase 1 — Commerce core B2B · En implementación. Fase 0 cerrada (`v0.1.0`).
