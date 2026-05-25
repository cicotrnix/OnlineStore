# Runbook · Desarrollo local

Tiempo estimado: < 10 min en máquina ya configurada.

## Prerrequisitos

- Node 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop
- Git

## Setup inicial

```bash
git clone https://github.com/pipowerweb/OnlineStore.git
cd OnlineStore
pnpm install
cp .env.example .env.local
```

Editar `.env.local`:

- `NEXTAUTH_SECRET` — generar con `openssl rand -base64 32`.
- `RESEND_API_KEY` — opcional en local; sin él los magic links no se envían pero la app arranca.

Levantar Postgres (puerto 5435 para evitar choques):

```bash
docker compose up -d
```

Aplicar schema:

```bash
pnpm exec prisma migrate dev
```

Arrancar Next.js:

```bash
pnpm dev
```

Abrir http://localhost:3000.

## Comandos comunes

```bash
pnpm test              # Vitest (unit)
RUN_INTEGRATION=1 pnpm test   # incluye integration tests contra DB
pnpm test:e2e          # Playwright (levanta dev server)
pnpm lint              # Biome
pnpm typecheck         # tsc --noEmit
pnpm build             # next build
pnpm db:studio         # GUI de la DB
pnpm db:reset          # destruye y recrea la DB local
```

## Apagar la DB

```bash
docker compose down       # mantiene los datos
docker compose down -v    # destruye los datos
```

## Troubleshooting

- **Puerto 5435 en uso** → editar `docker-compose.yml` y `DATABASE_URL` con otro puerto.
- **Migración pega error de pgvector** → la extensión está en la imagen `pgvector/pgvector:pg16`; verificar con `docker exec online-store-postgres psql -U postgres -d online_store_dev -c "SELECT extname FROM pg_extension;"`.
- **`pnpm dev` muestra error de Sentry** → es esperado si `SENTRY_DSN` está vacío; se ignora en runtime.
