# Spec — Fase 0: Fundación de la plantilla

- Proyecto: Online Store — Tienda B2B mayorista con IA
- Fase: 0 / 6
- Fecha: 2026-05-25
- Estado: Aprobado, listo para `writing-plans`
- Referencia: `ROADMAP.md` (documento maestro)

---

## 1. Objetivo

Construir el esqueleto del proyecto y todas las capacidades transversales sobre las que se montarán las 6 fases siguientes. Al cerrar Fase 0, debe ser posible:

- Clonar el repo, instalar dependencias, copiar `.env.example`, correr migraciones y arrancar la app en local en menos de 10 minutos.
- Loguearse, crear una organización, invitar a otro usuario, y ver un panel admin vacío.
- Hacer un push a `main` y ver el despliegue en Vercel automáticamente.
- Editar `store.config.ts` y `theme.config.ts` y ver el cambio reflejado en el storefront sin tocar código.

**No** tendremos catálogo, carrito, checkout ni IA todavía. Eso es Fase 1+.

## 2. Fuera de alcance (explícito)

- Catálogo de productos (Fase 1).
- Carrito, checkout, órdenes (Fase 1).
- RFQ, crédito, aprobaciones (Fase 2).
- Búsqueda semántica, embeddings (Fase 3).
- Chatbot, recomendaciones, generación de contenido (Fase 4).
- Stripe en serio, transportistas, ERP (Fase 5).
- CLI de scaffolding multi-tenant (Fase 6).

Cualquier feature de las fases siguientes que aparezca en Fase 0 es scope creep — se rechaza.

## 3. Decisiones de arquitectura (validadas con el usuario)

| Decisión | Elección | Razón breve |
|----------|----------|-------------|
| Estructura repo | Single Next.js app | Velocidad de arranque; refactor a monorepo en Fase 6 |
| Lenguaje | TypeScript estricto | Tipado end-to-end con tRPC + Zod |
| Framework | Next.js 14 (App Router) | SSR/ISR, edge runtime, ecosistema |
| UI | Tailwind + shadcn/ui | Componentes accesibles, velocidad, customización vía tokens |
| API | tRPC | Tipado cliente-servidor sin codegen |
| ORM | Prisma | Migraciones, tipado, productividad |
| DB | PostgreSQL 16 self-hosted en Coolify | Latencia ~0ms al app, sin vendor lock-in, costo cero adicional |
| Auth | Auth.js (NextAuth v5) | Open-source, control total, modelo de orgs propio |
| Hosting | Hetzner VPS + Coolify | Autonomía total, costo bajo predecible, Docker portable, sin trampa de renovación |
| VPS plan | Hetzner CX22 (Ashburn USA East) | 2 vCPU, 4 GB RAM, 40 GB SSD, $6/mes. Upgrade a CCX13 ($13/mes) cuando haya tráfico real |
| Monorepo | (Pospuesto a Fase 6) | Por decisión explícita del usuario |
| Testing | Vitest + Playwright + Testing Library | Estándar moderno, rápido |
| Linting | Biome | Más rápido que ESLint+Prettier, sin dual-tool churn |
| Logger | Pino + Sentry | Estructurado + capturas de errores |
| CI/CD | GitHub Actions + Coolify | Lint + typecheck + tests en GH Actions; deploy desde Coolify por webhook |
| Email transaccional | Resend (provider configurable) | Para magic links de Auth.js y futuros emails de orden |
| Idioma base | inglés (en-US) con i18n preparada | Mercado USA primario; LATAM en es-419 posterior |
| Moneda base | USD única | Decisión del usuario: USA + LATAM en USD |

## 4. Estructura de carpetas

```
online-store/
├── store.config.ts                # Configuración funcional de la tienda
├── theme.config.ts                # Tokens visuales
├── .env.example                   # Variables de entorno documentadas
├── README.md                      # Setup, conceptos clave, links
├── ROADMAP.md                     # (link al maestro en raíz)
├── package.json
├── tsconfig.json
├── biome.json
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
│
├── app/                           # Next.js App Router
│   ├── (storefront)/              # Rutas públicas
│   │   ├── layout.tsx
│   │   └── page.tsx               # Home placeholder
│   ├── (admin)/                   # Panel admin protegido
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard placeholder
│   │   └── settings/page.tsx      # Settings de organización
│   ├── (auth)/                    # Sign in, accept invite
│   │   ├── sign-in/page.tsx
│   │   └── invite/[token]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── trpc/[trpc]/route.ts
│       └── health/route.ts
│
├── modules/                       # Lógica de dominio (futuros packages)
│   ├── customers/                 # Organizations, members, invitations
│   │   ├── index.ts               # API pública del módulo
│   │   ├── service.ts             # Lógica de negocio
│   │   ├── repository.ts          # Acceso a Prisma
│   │   ├── schemas.ts             # Zod schemas
│   │   └── service.test.ts
│   └── config/                    # Lectura de store.config.ts
│       ├── index.ts
│       ├── loader.ts
│       └── loader.test.ts
│
├── components/
│   ├── ui/                        # shadcn/ui base (button, input, dialog, etc.)
│   ├── layout/                    # Header, footer, sidebar admin
│   └── auth/                      # Forms de sign-in, invite
│
├── lib/
│   ├── db/
│   │   ├── client.ts              # Prisma client singleton
│   │   └── seed.ts                # Seed para dev
│   ├── auth/
│   │   ├── config.ts              # NextAuth config
│   │   └── helpers.ts             # getCurrentUser, requireAuth, requireOrgRole
│   ├── trpc/
│   │   ├── server.ts              # initTRPC
│   │   ├── router.ts              # appRouter (root)
│   │   └── context.ts             # createContext
│   ├── observability/
│   │   ├── logger.ts              # Pino instance
│   │   └── sentry.ts              # Sentry init
│   ├── email/
│   │   └── send.ts                # Adapter (Resend hoy, otros mañana)
│   └── theme/
│       └── apply.ts               # Inyecta tokens del theme.config en CSS vars
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts           # Sign in, invite flow
│   │   └── smoke.spec.ts          # Storefront + admin load
│   └── setup.ts
│
└── docs/
    ├── specs/                     # Specs por fase (este archivo vive aquí)
    ├── plans/                     # Planes de implementación por fase
    ├── runbooks/                  # Operación, incidentes, oncall
    └── adr/                       # Architecture Decision Records
```

**Regla de oro de los módulos:** cada subcarpeta de `modules/` expone únicamente lo que está en su `index.ts`. Otros módulos importan desde `modules/customers` (no desde `modules/customers/service`). Esto facilita el refactor a paquetes en Fase 6.

## 5. Modelo de datos inicial (Prisma)

```prisma
// prisma/schema.prisma (extracto)

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// --- Auth.js core ---
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts      Account[]
  sessions      Session[]
  memberships   OrganizationMember[]
}

model Account { /* estándar Auth.js */ }
model Session { /* estándar Auth.js */ }
model VerificationToken { /* estándar Auth.js */ }

// --- B2B core ---
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     OrganizationMember[]
  invitations Invitation[]
}

enum OrgRole {
  OWNER
  ADMIN
  BUYER
  VIEWER
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole      @default(BUYER)
  createdAt      DateTime     @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([userId])
}

model Invitation {
  id             String       @id @default(cuid())
  organizationId String
  email          String
  role           OrgRole      @default(BUYER)
  token          String       @unique
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}
```

Las tablas de catálogo, órdenes, carrito etc. se introducirán en Fase 1 mediante migraciones nuevas.

## 6. Sistema de configuración

### `store.config.ts`

Archivo TypeScript en la raíz que exporta un objeto tipado. Cargado al build y en runtime mediante `modules/config/loader.ts`. Esquema validado con Zod.

```ts
// store.config.ts
import { defineStoreConfig } from './modules/config'

export default defineStoreConfig({
  identity: {
    name: 'Acme Wholesale',
    logo: '/brand/logo.svg',
    supportEmail: 'support@acme.example',
  },
  locale: {
    default: 'en-US',
    supported: ['en-US', 'es-419'],
  },
  currency: { base: 'USD' },
  modules: {
    rfq: false,            // Fase 2
    credit: false,         // Fase 2
    privateCatalogs: false,// Fase 2
    approvals: false,      // Fase 2
    semanticSearch: false, // Fase 3
    aiChat: false,         // Fase 4
  },
  payments: {
    stripe: { enabled: false }, // Fase 5
    mercadopago: { enabled: false },
  },
  ui: {
    defaultView: 'cards',
    allowToggle: true,
  },
})
```

### `theme.config.ts`

```ts
import { defineTheme } from './modules/config'

export default defineTheme({
  colors: {
    primary: '#0F6E56',
    accent: '#534AB7',
    surface: '#FFFFFF',
    muted: '#F1EFE8',
    danger: '#A32D2D',
  },
  typography: {
    sans: 'Inter, system-ui, sans-serif',
    scale: 'comfortable', // compact | comfortable | spacious
  },
  radius: { card: 12, button: 8, input: 8 },
  density: 'regular',
})
```

`defineStoreConfig` y `defineTheme` validan con Zod y devuelven el objeto tipado. `lib/theme/apply.ts` traduce el theme a CSS variables aplicadas en `<html>` desde el root layout.

## 7. Páginas y flujos a entregar

### Storefront (placeholder)
- `/` — homepage que muestra el nombre de la tienda (leído de `store.config.ts`) y el logo del theme. Muestra "Próximamente: catálogo".

### Auth
- `/sign-in` — magic link via Auth.js + Resend.
- `/invite/[token]` — aceptar invitación, asociar usuario a organización.

### Admin
- `/admin` — dashboard placeholder, muestra organización activa y miembros.
- `/admin/settings` — settings de organización: nombre, slug, miembros, invitaciones.

### Endpoints API
- `/api/auth/[...nextauth]` — Auth.js handler.
- `/api/trpc/[trpc]` — tRPC handler.
- `/api/health` — health check para Vercel.

## 8. Testing

### Unit (Vitest)
- `modules/config/loader.test.ts` — valida que un config inválido tira error claro.
- `modules/customers/service.test.ts` — crear org, invitar, aceptar, cambiar rol, eliminar miembro.

### Integración (Vitest + DB)
- Flujo completo de invitación contra DB real (Neon branch).

### E2E (Playwright)
- `tests/e2e/auth.spec.ts` — sign-in con magic link mockeado, accept invite.
- `tests/e2e/smoke.spec.ts` — homepage carga + admin requiere auth + redirige a sign-in.

### Cobertura mínima al cerrar Fase 0
- `modules/customers`: 80%+
- `modules/config`: 100% (es crítico)
- Otros módulos: smoke tests

## 9. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)
1. **Install** — pnpm install con cache.
2. **Lint** — `biome check`.
3. **Typecheck** — `tsc --noEmit`.
4. **Test (unit)** — `vitest run`.
5. **Test (e2e)** — Playwright contra preview de Vercel.
6. **Build** — `next build` (sanity check).

Cada PR dispara el workflow y un **preview de Vercel** con su propia branch de Neon. Merge a `main` requiere CI verde y review aprobado.

### Deploy
- Coolify instalado en VPS Hetzner. Conectado al repo de GitHub vía webhook.
- `main` → producción automática.
- Branches con prefijo `preview/*` → ambiente de preview en Coolify con dominio temporal.
- Postgres por ambiente (producción + preview compartido al inicio, separable después).
- Variables de entorno gestionadas en Coolify dashboard, encriptadas en disco.
- SSL automático vía Let's Encrypt (Coolify lo gestiona).
- Dominio principal apuntando con A record al IP del VPS.

## 10. Observabilidad mínima

- **Sentry** — captura de errores en cliente y servidor. Source maps subidos en build.
- **Pino** — logger estructurado JSON en runtime. Levels: `debug | info | warn | error`. En producción solo `info+`. Incluye `requestId`, `userId`, `organizationId` en cada log donde aplique.
- **Vercel Analytics** — Core Web Vitals (gratis con Vercel).
- `lib/observability/logger.ts` y `sentry.ts` exponen APIs idiomáticas; nadie llama a Sentry o Pino directamente.

## 11. Variables de entorno requeridas

```
# .env.example
DATABASE_URL=                  # Postgres (Coolify-managed en prod, Docker local en dev)
NEXTAUTH_SECRET=               # openssl rand -base64 32
NEXTAUTH_URL=                  # http://localhost:3000 en dev | https://tu-dominio.com en prod
RESEND_API_KEY=                # email transaccional
RESEND_FROM_EMAIL=             # noreply@tu-dominio.com (configurar SPF/DKIM)
SENTRY_DSN=                    # Sentry server
NEXT_PUBLIC_SENTRY_DSN=        # Sentry client
NODE_ENV=                      # development | production
```

## 12. Documentación entregable

- `README.md` — Quick start, comandos comunes, conceptos clave.
- `docs/adr/0001-single-app-vs-monorepo.md` — ADR de la decisión de arrancar simple.
- `docs/adr/0002-auth-nextauth-vs-clerk.md` — ADR de la decisión de Auth.js.
- `docs/runbooks/local-dev.md` — Setup completo paso a paso.
- `docs/runbooks/deploy-rollback.md` — Cómo rollback en Vercel.

## 13. Criterios de aceptación

Fase 0 se considera cerrada cuando **todas** estas afirmaciones son ciertas:

1. `pnpm install && pnpm dev` levanta el storefront en `localhost:3000` sin errores.
2. Una persona sin contexto puede seguir `docs/runbooks/local-dev.md` y tener todo corriendo en < 10 min.
3. Editar `store.config.ts` (cambiar `identity.name`) se refleja en el header sin reiniciar.
4. Editar `theme.config.ts` (cambiar `colors.primary`) cambia el color de botones en la app.
5. Un usuario puede registrarse vía magic link, crear una organización e invitar a un segundo usuario.
6. El segundo usuario recibe el email, abre `/invite/[token]` y queda como `BUYER` de la organización.
7. Las rutas `/admin/*` requieren sesión válida y redirigen a `/sign-in` si no hay.
8. CI corre en cada PR y bloquea el merge si lint, typecheck o tests fallan.
9. Cada PR genera un preview deploy en Vercel con su propia branch de Neon.
10. Un error lanzado en producción aparece en Sentry con stack trace legible.
11. `vitest run` y `playwright test` pasan en local y en CI.
12. `pnpm build` produce un build de Next.js sin warnings críticos.

## 14. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Refactor a monorepo en Fase 6 duele | Media | Medio | Disciplina estricta de imports vía `index.ts` por módulo; revisar con `engineering:code-review` cada PR |
| Auth.js v5 todavía en beta | Baja | Medio | Si v5 da problemas, pinear a v4 estable; ADR documenta la opción |
| Magic links de Resend bloqueados por antispam | Media | Bajo | Configurar SPF/DKIM en dominio desde día 1 |
| VPS único = single point of failure | Media | Medio | Backups automáticos diarios de DB a Hetzner Storage Box; runbook de restauración probado; uptime monitoring externo (Uptime Kuma o BetterStack) con alertas a email/Telegram |
| Olvidar actualizaciones de seguridad del SO | Media | Medio | `unattended-upgrades` activado para parches automáticos; checklist mensual de mantenimiento en `docs/runbooks/vps-maintenance.md` |
| Perder acceso SSH al VPS | Baja | Alto | Llaves SSH guardadas en gestor de contraseñas; rescue mode de Hetzner como fallback; segundo usuario admin en el VPS |

## 15. Próximos pasos al cerrar Fase 0

1. Actualizar `ROADMAP.md` (sección "Estado") marcando Fase 0 como completada.
2. Actualizar memoria (`online-store-phases.md`) con fecha de cierre y aprendizajes.
3. Brainstorming de Fase 1 — Commerce core B2B.
4. Spec de Fase 1.

---

*Este spec está congelado. Cambios mayores requieren nuevo brainstorming. Cambios menores (typo, claridad) se editan directamente con commit que lo registre.*
