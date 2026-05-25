# Plan de implementación — Fase 0: Fundación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el esqueleto de la tienda B2B mayorista con autenticación, organizaciones B2B, sistema de configuración, observabilidad y despliegue a Hetzner VPS con Coolify.

**Architecture:** Una sola app Next.js 14 (App Router) en TypeScript, módulos de dominio aislados en `modules/`, Postgres self-hosted, deploy automático vía Coolify. TDD obligatorio en módulos de negocio (`customers`, `config`).

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, Auth.js v5, Prisma, PostgreSQL 16, tRPC, Vitest, Playwright, Biome, Pino, Sentry, Coolify, Hetzner VPS CX22.

**Spec de referencia:** `docs/specs/2026-05-25-fase-0-fundacion.md`

---

## Parte 1 — Setup local del proyecto

### Task 1: Crear repositorio GitHub y clonar

**Files:**
- Crear repo `online-store` en GitHub (web UI)

- [ ] **Step 1: Crear repo en GitHub.com**

En github.com/new crear un repo privado llamado `online-store` sin README, sin .gitignore, sin licencia (lo crearemos local).

- [ ] **Step 2: Clonar localmente**

Run:
```bash
cd ~/Documents/Claude/Projects
git clone git@github.com:<tu-usuario>/online-store.git
cd online-store
```

Expected: clonado vacío.

- [ ] **Step 3: Configurar git**

Run:
```bash
git config user.name "Herney"
git config user.email "cicotics@gmail.com"
```

---

### Task 2: Inicializar Next.js 14 con TypeScript y App Router

**Files:**
- Crear: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`

- [ ] **Step 1: Crear app Next.js**

Run:
```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint=false --app --src-dir=false --import-alias="@/*" --use-pnpm
```

Cuando pregunte sobre Turbopack, responder yes.

Expected: estructura base creada.

- [ ] **Step 2: Verificar que arranca**

Run:
```bash
pnpm dev
```

Abrir http://localhost:3000. Verificar que carga la home de Next.js. Cerrar con Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 app with TypeScript and Tailwind"
git push origin main
```

---

### Task 3: Configurar TypeScript estricto

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Activar strict mode completo**

Reemplazar `tsconfig.json` con:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Verificar typecheck**

Run:
```bash
pnpm tsc --noEmit
```

Expected: PASS sin errores.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable strict TypeScript mode"
```

---

### Task 4: Reemplazar ESLint por Biome

**Files:**
- Crear: `biome.json`
- Modify: `package.json`

- [ ] **Step 1: Instalar Biome**

Run:
```bash
pnpm add -D --save-exact @biomejs/biome
```

- [ ] **Step 2: Crear configuración**

Crear `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useImportType": "error",
        "noNonNullAssertion": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" }
  },
  "files": {
    "ignore": ["node_modules", ".next", "dist", "build", "coverage"]
  }
}
```

- [ ] **Step 3: Agregar scripts a package.json**

En `package.json`, reemplazar la sección `"scripts"` por:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "format": "biome format --write .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 4: Aplicar formato a todo el código**

Run:
```bash
pnpm lint:fix
```

- [ ] **Step 5: Commit**

```bash
git add biome.json package.json pnpm-lock.yaml .
git commit -m "chore: replace ESLint with Biome and apply formatting"
```

---

### Task 5: Configurar Vitest

**Files:**
- Crear: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest**

Run:
```bash
pnpm add -D vitest @vitest/ui @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Crear vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '.next', 'tests', '**/*.config.*']
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') }
  }
})
```

- [ ] **Step 3: Crear tests/setup.ts**

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Agregar scripts**

En `package.json` scripts agregar:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Test placeholder para verificar**

Crear `tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Correr tests**

Run:
```bash
pnpm test
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest for unit tests"
```

---

### Task 6: Configurar Playwright para E2E

**Files:**
- Crear: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Instalar Playwright**

Run:
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Crear playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
```

- [ ] **Step 3: Crear smoke E2E**

Crear `tests/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('storefront homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
})
```

- [ ] **Step 4: Agregar scripts y .gitignore**

En `package.json` scripts:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

En `.gitignore` agregar:

```
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 5: Correr E2E**

Run:
```bash
pnpm test:e2e
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Playwright for E2E tests"
```

---

## Parte 2 — Base de datos y Postgres local con Docker

### Task 7: Docker Compose para Postgres local

**Files:**
- Crear: `docker-compose.yml`, `.env.example`, `.env.local`

- [ ] **Step 1: Crear docker-compose.yml**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: online-store-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: online_store_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 2: Crear .env.example**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_store_dev
NEXTAUTH_SECRET=replace-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
NODE_ENV=development
```

- [ ] **Step 3: Crear .env.local (no commitear)**

Copiar de `.env.example` y rellenar valores reales. Generar `NEXTAUTH_SECRET` con:

```bash
openssl rand -base64 32
```

- [ ] **Step 4: Verificar .env.local en .gitignore**

Verificar que `.gitignore` contiene `.env*.local` y `.env`. Si no:

```bash
echo ".env*.local" >> .gitignore
echo ".env" >> .gitignore
```

- [ ] **Step 5: Levantar Postgres**

Run:
```bash
docker compose up -d
```

Expected: container postgres iniciado.

- [ ] **Step 6: Verificar conexión**

Run:
```bash
docker exec online-store-postgres psql -U postgres -d online_store_dev -c "SELECT version();"
```

Expected: PostgreSQL 16.x.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat: docker compose for local Postgres with pgvector"
```

---

### Task 8: Instalar y configurar Prisma

**Files:**
- Crear: `prisma/schema.prisma`, `lib/db/client.ts`

- [ ] **Step 1: Instalar Prisma**

Run:
```bash
pnpm add -D prisma
pnpm add @prisma/client
pnpm exec prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Configurar schema base**

Reemplazar `prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}
```

- [ ] **Step 3: Habilitar extensión pgvector**

Run:
```bash
docker exec online-store-postgres psql -U postgres -d online_store_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

- [ ] **Step 4: Crear client singleton**

Crear `lib/db/client.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: install Prisma with pgvector support"
```

---

### Task 9: Schema Prisma — Auth.js + B2B

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar modelos**

Agregar al final de `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts    Account[]
  sessions    Session[]
  memberships OrganizationMember[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

enum OrgRole {
  OWNER
  ADMIN
  BUYER
  VIEWER
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     OrganizationMember[]
  invitations Invitation[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole  @default(BUYER)
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([userId])
}

model Invitation {
  id             String    @id @default(cuid())
  organizationId String
  email          String
  role           OrgRole   @default(BUYER)
  token          String    @unique
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime  @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([email])
}
```

- [ ] **Step 2: Crear primera migración**

Run:
```bash
pnpm exec prisma migrate dev --name init
```

Expected: migración aplicada, Prisma Client generado.

- [ ] **Step 3: Verificar con Prisma Studio**

Run:
```bash
pnpm exec prisma studio &
```

Abrir http://localhost:5555. Verificar que aparecen las tablas. Cerrar.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: initial Prisma schema for Auth.js and B2B organizations"
```

---

## Parte 3 — Sistema de configuración (TDD)

### Task 10: Módulo config — schemas Zod (test first)

**Files:**
- Crear: `modules/config/schemas.ts`, `modules/config/schemas.test.ts`

- [ ] **Step 1: Instalar Zod**

Run:
```bash
pnpm add zod
```

- [ ] **Step 2: Escribir test que falla**

Crear `modules/config/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { storeConfigSchema, themeConfigSchema } from './schemas'

describe('storeConfigSchema', () => {
  it('accepts minimal valid config', () => {
    const result = storeConfigSchema.parse({
      identity: { name: 'Acme', logo: '/logo.svg', supportEmail: 'support@acme.com' },
      locale: { default: 'en-US', supported: ['en-US'] },
      currency: { base: 'USD' },
      modules: { rfq: false, credit: false, privateCatalogs: false, approvals: false, semanticSearch: false, aiChat: false },
      payments: { stripe: { enabled: false }, mercadopago: { enabled: false } },
      ui: { defaultView: 'cards', allowToggle: true }
    })
    expect(result.identity.name).toBe('Acme')
  })

  it('rejects invalid currency code', () => {
    expect(() => storeConfigSchema.parse({
      identity: { name: 'X', logo: '/l.svg', supportEmail: 'a@b.com' },
      locale: { default: 'en-US', supported: ['en-US'] },
      currency: { base: 'XYZ' },
      modules: { rfq: false, credit: false, privateCatalogs: false, approvals: false, semanticSearch: false, aiChat: false },
      payments: { stripe: { enabled: false }, mercadopago: { enabled: false } },
      ui: { defaultView: 'cards', allowToggle: true }
    })).toThrow()
  })

  it('rejects unsupported defaultView', () => {
    expect(() => storeConfigSchema.parse({
      identity: { name: 'X', logo: '/l.svg', supportEmail: 'a@b.com' },
      locale: { default: 'en-US', supported: ['en-US'] },
      currency: { base: 'USD' },
      modules: { rfq: false, credit: false, privateCatalogs: false, approvals: false, semanticSearch: false, aiChat: false },
      payments: { stripe: { enabled: false }, mercadopago: { enabled: false } },
      ui: { defaultView: 'invalid' as 'cards', allowToggle: true }
    })).toThrow()
  })
})

describe('themeConfigSchema', () => {
  it('accepts valid theme', () => {
    const result = themeConfigSchema.parse({
      colors: { primary: '#0F6E56', accent: '#534AB7', surface: '#FFFFFF', muted: '#F1EFE8', danger: '#A32D2D' },
      typography: { sans: 'Inter', scale: 'comfortable' },
      radius: { card: 12, button: 8, input: 8 },
      density: 'regular'
    })
    expect(result.colors.primary).toBe('#0F6E56')
  })

  it('rejects invalid hex color', () => {
    expect(() => themeConfigSchema.parse({
      colors: { primary: 'not-a-color', accent: '#000', surface: '#FFF', muted: '#000', danger: '#000' },
      typography: { sans: 'Inter', scale: 'comfortable' },
      radius: { card: 12, button: 8, input: 8 },
      density: 'regular'
    })).toThrow()
  })
})
```

- [ ] **Step 3: Verificar que falla**

Run:
```bash
pnpm test modules/config/schemas
```

Expected: FAIL (módulo no existe aún).

- [ ] **Step 4: Implementar schemas mínimos**

Crear `modules/config/schemas.ts`:

```typescript
import { z } from 'zod'

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex color')

export const storeConfigSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    logo: z.string().min(1),
    supportEmail: z.string().email()
  }),
  locale: z.object({
    default: z.string(),
    supported: z.array(z.string()).min(1)
  }),
  currency: z.object({
    base: z.enum(['USD'])
  }),
  modules: z.object({
    rfq: z.boolean(),
    credit: z.boolean(),
    privateCatalogs: z.boolean(),
    approvals: z.boolean(),
    semanticSearch: z.boolean(),
    aiChat: z.boolean()
  }),
  payments: z.object({
    stripe: z.object({ enabled: z.boolean() }),
    mercadopago: z.object({ enabled: z.boolean() })
  }),
  ui: z.object({
    defaultView: z.enum(['cards', 'list']),
    allowToggle: z.boolean()
  })
})

export const themeConfigSchema = z.object({
  colors: z.object({
    primary: hexColor,
    accent: hexColor,
    surface: hexColor,
    muted: hexColor,
    danger: hexColor
  }),
  typography: z.object({
    sans: z.string().min(1),
    scale: z.enum(['compact', 'comfortable', 'spacious'])
  }),
  radius: z.object({
    card: z.number().int().min(0),
    button: z.number().int().min(0),
    input: z.number().int().min(0)
  }),
  density: z.enum(['compact', 'regular', 'spacious'])
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type ThemeConfig = z.infer<typeof themeConfigSchema>
```

- [ ] **Step 5: Verificar que pasa**

Run:
```bash
pnpm test modules/config/schemas
```

Expected: PASS 5 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(config): Zod schemas for store and theme config with tests"
```

---

### Task 11: Módulo config — loader y helpers

**Files:**
- Crear: `modules/config/loader.ts`, `modules/config/index.ts`

- [ ] **Step 1: Crear loader y exports**

Crear `modules/config/loader.ts`:

```typescript
import { storeConfigSchema, themeConfigSchema, type StoreConfig, type ThemeConfig } from './schemas'

export function defineStoreConfig(config: StoreConfig): StoreConfig {
  return storeConfigSchema.parse(config)
}

export function defineTheme(config: ThemeConfig): ThemeConfig {
  return themeConfigSchema.parse(config)
}
```

Crear `modules/config/index.ts`:

```typescript
export { defineStoreConfig, defineTheme } from './loader'
export { storeConfigSchema, themeConfigSchema } from './schemas'
export type { StoreConfig, ThemeConfig } from './schemas'
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(config): defineStoreConfig and defineTheme helpers"
```

---

### Task 12: store.config.ts y theme.config.ts en raíz

**Files:**
- Crear: `store.config.ts`, `theme.config.ts`

- [ ] **Step 1: Crear store.config.ts**

```typescript
import { defineStoreConfig } from './modules/config'

export default defineStoreConfig({
  identity: {
    name: 'Acme Wholesale',
    logo: '/brand/logo.svg',
    supportEmail: 'support@acme.example'
  },
  locale: {
    default: 'en-US',
    supported: ['en-US', 'es-419']
  },
  currency: { base: 'USD' },
  modules: {
    rfq: false,
    credit: false,
    privateCatalogs: false,
    approvals: false,
    semanticSearch: false,
    aiChat: false
  },
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false }
  },
  ui: {
    defaultView: 'cards',
    allowToggle: true
  }
})
```

- [ ] **Step 2: Crear theme.config.ts**

```typescript
import { defineTheme } from './modules/config'

export default defineTheme({
  colors: {
    primary: '#0F6E56',
    accent: '#534AB7',
    surface: '#FFFFFF',
    muted: '#F1EFE8',
    danger: '#A32D2D'
  },
  typography: {
    sans: 'Inter, system-ui, sans-serif',
    scale: 'comfortable'
  },
  radius: { card: 12, button: 8, input: 8 },
  density: 'regular'
})
```

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add store.config.ts theme.config.ts
git commit -m "feat(config): default store and theme configs at root"
```

---

### Task 13: Aplicar theme tokens como CSS variables

**Files:**
- Crear: `lib/theme/apply.ts`
- Modify: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Crear helper de theme**

Crear `lib/theme/apply.ts`:

```typescript
import type { ThemeConfig } from '@/modules/config'

export function themeToCssVars(theme: ThemeConfig): string {
  return `
    --color-primary: ${theme.colors.primary};
    --color-accent: ${theme.colors.accent};
    --color-surface: ${theme.colors.surface};
    --color-muted: ${theme.colors.muted};
    --color-danger: ${theme.colors.danger};
    --font-sans: ${theme.typography.sans};
    --radius-card: ${theme.radius.card}px;
    --radius-button: ${theme.radius.button}px;
    --radius-input: ${theme.radius.input}px;
  `.trim()
}
```

- [ ] **Step 2: Aplicar theme en layout root**

Reemplazar `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'
import storeConfig from '@/store.config'
import themeConfig from '@/theme.config'
import { themeToCssVars } from '@/lib/theme/apply'

export const metadata: Metadata = {
  title: storeConfig.identity.name,
  description: `${storeConfig.identity.name} wholesale store`
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={storeConfig.locale.default}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${themeToCssVars(themeConfig)} }` }} />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: 'var(--font-sans)' }}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Página home usa el config**

Reemplazar `app/page.tsx`:

```typescript
import storeConfig from '@/store.config'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-medium" style={{ color: 'var(--color-primary)' }}>
          {storeConfig.identity.name}
        </h1>
        <p className="mt-4 text-gray-600">Wholesale store · Coming soon</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verificar en navegador**

Run:
```bash
pnpm dev
```

Abrir http://localhost:3000. Verificar que muestra "Acme Wholesale" en verde-teal. Editar `store.config.ts` cambiando `name` a "Test Store", refrescar, verificar cambio.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): apply theme tokens as CSS variables in root layout"
```

---

## Parte 4 — Autenticación con Auth.js v5

### Task 14: Instalar Auth.js v5 y Resend

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
pnpm add next-auth@beta @auth/prisma-adapter resend nodemailer
pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install Auth.js v5 with Prisma adapter and Resend"
```

---

### Task 15: Configurar Auth.js

**Files:**
- Crear: `lib/auth/config.ts`, `lib/auth/index.ts`, `app/api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts`

- [ ] **Step 1: Crear config**

Crear `lib/auth/config.ts`:

```typescript
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Resend from 'next-auth/providers/resend'
import { prisma } from '@/lib/db/client'
import storeConfig from '@/store.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      name: `Sign in to ${storeConfig.identity.name}`
    })
  ],
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in?check=email'
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    }
  }
})
```

- [ ] **Step 2: Crear index del módulo**

Crear `lib/auth/index.ts`:

```typescript
export { handlers, auth, signIn, signOut } from './config'
```

- [ ] **Step 3: Crear route handler**

Crear `app/api/auth/[...nextauth]/route.ts`:

```typescript
export { GET, POST } from '@/lib/auth/config'
```

Esperar — debe ser:

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Tipar la sesión**

Crear `types/next-auth.d.ts`:

```typescript
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}
```

- [ ] **Step 5: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): configure Auth.js v5 with Resend magic links and Prisma adapter"
```

---

### Task 16: Auth helpers — getCurrentUser y requireAuth

**Files:**
- Crear: `lib/auth/helpers.ts`, `lib/auth/helpers.test.ts`

- [ ] **Step 1: Escribir tests primero**

Crear `lib/auth/helpers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import { getCurrentUser, requireAuth } from './helpers'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('./config', () => ({ auth: vi.fn() }))

import { auth } from './config'

describe('getCurrentUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user when session exists', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    const user = await getCurrentUser()
    expect(user).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('returns null when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user when authed', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    const user = await requireAuth()
    expect(user.id).toBe('u1')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects to /sign-in when not authed', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await requireAuth()
    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run:
```bash
pnpm test lib/auth/helpers
```

Expected: FAIL.

- [ ] **Step 3: Implementar helpers**

Crear `lib/auth/helpers.ts`:

```typescript
import { redirect } from 'next/navigation'
import { auth } from './config'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }
  return user
}
```

- [ ] **Step 4: Verificar tests pasan**

Run:
```bash
pnpm test lib/auth/helpers
```

Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): getCurrentUser and requireAuth helpers with tests"
```

---

### Task 17: Página /sign-in

**Files:**
- Crear: `app/(auth)/sign-in/page.tsx`, `app/(auth)/layout.tsx`

- [ ] **Step 1: Layout del grupo auth**

Crear `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white border rounded-xl p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Página sign-in con magic link**

Crear `app/(auth)/sign-in/page.tsx`:

```typescript
import { signIn } from '@/lib/auth'
import storeConfig from '@/store.config'

export default function SignInPage({ searchParams }: { searchParams: { check?: string } }) {
  const checkInbox = searchParams.check === 'email'

  if (checkInbox) {
    return (
      <div>
        <h1 className="text-xl font-medium">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          We sent a magic link to your inbox. Click it to sign in.
        </p>
      </div>
    )
  }

  async function handleSignIn(formData: FormData) {
    'use server'
    await signIn('resend', { email: formData.get('email') as string })
  }

  return (
    <div>
      <h1 className="text-xl font-medium">Sign in to {storeConfig.identity.name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter your email and we will send you a magic link.
      </p>
      <form action={handleSignIn} className="mt-6 space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
        <button
          type="submit"
          className="w-full py-2 rounded-md text-white text-sm"
          style={{ background: 'var(--color-primary)' }}
        >
          Send magic link
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verificar manualmente**

Run:
```bash
pnpm dev
```

Abrir http://localhost:3000/sign-in. Verificar que el formulario carga. (No hace falta probar el envío de email todavía si no hay RESEND_API_KEY válida.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): sign-in page with Resend magic link"
```

---

## Parte 5 — Módulo customers (organizaciones B2B) con TDD

### Task 18: customers — schemas Zod

**Files:**
- Crear: `modules/customers/schemas.ts`, `modules/customers/schemas.test.ts`

- [ ] **Step 1: Tests primero**

Crear `modules/customers/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createOrganizationSchema, inviteMemberSchema, orgRoleSchema } from './schemas'

describe('createOrganizationSchema', () => {
  it('accepts valid input', () => {
    const result = createOrganizationSchema.parse({ name: 'Acme Co', slug: 'acme-co' })
    expect(result.slug).toBe('acme-co')
  })

  it('rejects slug with uppercase', () => {
    expect(() => createOrganizationSchema.parse({ name: 'X', slug: 'Acme' })).toThrow()
  })

  it('rejects slug with spaces', () => {
    expect(() => createOrganizationSchema.parse({ name: 'X', slug: 'acme co' })).toThrow()
  })
})

describe('inviteMemberSchema', () => {
  it('defaults role to BUYER', () => {
    const result = inviteMemberSchema.parse({ email: 'a@b.com' })
    expect(result.role).toBe('BUYER')
  })

  it('rejects invalid email', () => {
    expect(() => inviteMemberSchema.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('orgRoleSchema', () => {
  it('accepts all valid roles', () => {
    for (const role of ['OWNER', 'ADMIN', 'BUYER', 'VIEWER']) {
      expect(orgRoleSchema.parse(role)).toBe(role)
    }
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run:
```bash
pnpm test modules/customers/schemas
```

Expected: FAIL.

- [ ] **Step 3: Implementar schemas**

Crear `modules/customers/schemas.ts`:

```typescript
import { z } from 'zod'

export const orgRoleSchema = z.enum(['OWNER', 'ADMIN', 'BUYER', 'VIEWER'])

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and dashes only').min(2).max(50)
})

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: orgRoleSchema.default('BUYER')
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type OrgRole = z.infer<typeof orgRoleSchema>
```

- [ ] **Step 4: Verificar pasan**

Run:
```bash
pnpm test modules/customers/schemas
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(customers): Zod schemas for organizations with tests"
```

---

### Task 19: customers — repository

**Files:**
- Crear: `modules/customers/repository.ts`

- [ ] **Step 1: Implementar repositorio**

Crear `modules/customers/repository.ts`:

```typescript
import { prisma } from '@/lib/db/client'
import type { OrgRole } from './schemas'

export const customersRepository = {
  async createOrganization(input: { name: string; slug: string; ownerUserId: string }) {
    return prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: {
          create: {
            userId: input.ownerUserId,
            role: 'OWNER'
          }
        }
      },
      include: { members: true }
    })
  },

  async findOrganizationBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } }
    })
  },

  async findOrganizationsForUser(userId: string) {
    return prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { members: true }
    })
  },

  async createInvitation(input: { organizationId: string; email: string; role: OrgRole; token: string; expiresAt: Date }) {
    return prisma.invitation.create({ data: input })
  },

  async findInvitationByToken(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: { organization: true }
    })
  },

  async acceptInvitation(input: { invitationId: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.update({
        where: { id: input.invitationId },
        data: { acceptedAt: new Date() }
      })
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: input.userId,
          role: invitation.role
        }
      })
      return invitation
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(customers): repository layer for organizations and invitations"
```

---

### Task 20: customers — service con tests de integración

**Files:**
- Crear: `modules/customers/service.ts`, `modules/customers/service.test.ts`

- [ ] **Step 1: Tests de integración con DB**

Crear `modules/customers/service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/client'
import { customersService } from './service'

async function createTestUser(email: string) {
  return prisma.user.create({ data: { email } })
}

describe('customersService (integration)', () => {
  beforeEach(async () => {
    await prisma.invitation.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates organization with owner', async () => {
    const user = await createTestUser('owner@test.com')
    const org = await customersService.createOrganization({ name: 'Acme', slug: 'acme', ownerUserId: user.id })
    expect(org.name).toBe('Acme')
    expect(org.members).toHaveLength(1)
    expect(org.members[0]?.role).toBe('OWNER')
  })

  it('rejects duplicate slug', async () => {
    const user = await createTestUser('owner@test.com')
    await customersService.createOrganization({ name: 'A', slug: 'acme', ownerUserId: user.id })
    await expect(
      customersService.createOrganization({ name: 'B', slug: 'acme', ownerUserId: user.id })
    ).rejects.toThrow()
  })

  it('invites member and accepts invitation', async () => {
    const owner = await createTestUser('owner@test.com')
    const invitee = await createTestUser('invitee@test.com')
    const org = await customersService.createOrganization({ name: 'A', slug: 'a', ownerUserId: owner.id })

    const invitation = await customersService.inviteMember({
      organizationId: org.id,
      email: 'invitee@test.com',
      role: 'BUYER'
    })

    expect(invitation.token).toBeTruthy()
    expect(invitation.acceptedAt).toBeNull()

    await customersService.acceptInvitation({ token: invitation.token, userId: invitee.id })

    const updated = await prisma.organization.findUnique({
      where: { id: org.id },
      include: { members: true }
    })
    expect(updated?.members).toHaveLength(2)
  })

  it('rejects accepting expired invitation', async () => {
    const owner = await createTestUser('owner@test.com')
    const invitee = await createTestUser('invitee@test.com')
    const org = await customersService.createOrganization({ name: 'A', slug: 'a', ownerUserId: owner.id })

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: 'invitee@test.com',
        role: 'BUYER',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000)
      }
    })

    await expect(
      customersService.acceptInvitation({ token: invitation.token, userId: invitee.id })
    ).rejects.toThrow(/expired/i)
  })
})
```

- [ ] **Step 2: Implementar servicio**

Crear `modules/customers/service.ts`:

```typescript
import { randomBytes } from 'node:crypto'
import { customersRepository } from './repository'
import { createOrganizationSchema, inviteMemberSchema, type OrgRole } from './schemas'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const customersService = {
  async createOrganization(input: { name: string; slug: string; ownerUserId: string }) {
    const parsed = createOrganizationSchema.parse({ name: input.name, slug: input.slug })
    return customersRepository.createOrganization({ ...parsed, ownerUserId: input.ownerUserId })
  },

  async inviteMember(input: { organizationId: string; email: string; role?: OrgRole }) {
    const parsed = inviteMemberSchema.parse({ email: input.email, role: input.role })
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
    return customersRepository.createInvitation({
      organizationId: input.organizationId,
      email: parsed.email,
      role: parsed.role,
      token,
      expiresAt
    })
  },

  async acceptInvitation(input: { token: string; userId: string }) {
    const invitation = await customersRepository.findInvitationByToken(input.token)
    if (!invitation) throw new Error('Invitation not found')
    if (invitation.acceptedAt) throw new Error('Invitation already accepted')
    if (invitation.expiresAt < new Date()) throw new Error('Invitation expired')
    return customersRepository.acceptInvitation({ invitationId: invitation.id, userId: input.userId })
  },

  async listForUser(userId: string) {
    return customersRepository.findOrganizationsForUser(userId)
  }
}
```

- [ ] **Step 3: Correr tests contra DB local**

Run:
```bash
pnpm test modules/customers/service
```

Expected: PASS 4 tests.

- [ ] **Step 4: API pública del módulo**

Crear `modules/customers/index.ts`:

```typescript
export { customersService } from './service'
export type { CreateOrganizationInput, InviteMemberInput, OrgRole } from './schemas'
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(customers): service layer with TDD for orgs and invitations"
```

---

## Parte 6 — Páginas admin y flujos de invitación

### Task 21: Componentes UI base (shadcn/ui)

**Files:**
- Crear: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`

- [ ] **Step 1: Inicializar shadcn**

Run:
```bash
pnpm dlx shadcn@latest init -d
```

Cuando pregunte, aceptar defaults (TypeScript, slate base color, app dir, components in `components/`).

- [ ] **Step 2: Agregar componentes mínimos**

Run:
```bash
pnpm dlx shadcn@latest add button input label card form dialog
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add shadcn/ui base components (button, input, label, card, form, dialog)"
```

---

### Task 22: Panel admin con middleware de auth

**Files:**
- Crear: `middleware.ts`, `app/(admin)/layout.tsx`, `app/(admin)/page.tsx`

- [ ] **Step 1: Middleware de auth**

Crear `middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (isAdmin && !req.auth) {
    const url = new URL('/sign-in', req.url)
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ['/admin/:path*']
}
```

- [ ] **Step 2: Layout admin**

Crear `app/(admin)/layout.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  const orgs = await customersService.listForUser(user.id)

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-50 border-r p-4">
        <h2 className="text-sm font-medium text-gray-500">Admin</h2>
        <nav className="mt-4 space-y-1">
          <Link href="/admin" className="block px-3 py-2 rounded text-sm hover:bg-gray-100">Dashboard</Link>
          <Link href="/admin/settings" className="block px-3 py-2 rounded text-sm hover:bg-gray-100">Settings</Link>
        </nav>
        <div className="mt-8 text-xs text-gray-500">
          Signed in as <strong>{user.email}</strong>
          <div className="mt-2">Organizations: {orgs.length}</div>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Dashboard placeholder**

Crear `app/(admin)/page.tsx`:

```typescript
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-medium">Dashboard</h1>
      <p className="mt-2 text-gray-600">Phase 0 — placeholder. Phase 1 will add metrics here.</p>
    </div>
  )
}
```

- [ ] **Step 4: Verificar**

Run:
```bash
pnpm dev
```

Abrir http://localhost:3000/admin. Verificar redirect a /sign-in.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): protected admin layout with sidebar and middleware"
```

---

### Task 23: Página de settings con crear org e invitar miembros

**Files:**
- Crear: `app/(admin)/settings/page.tsx`, `app/(admin)/settings/actions.ts`

- [ ] **Step 1: Server actions**

Crear `app/(admin)/settings/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'

export async function createOrganizationAction(formData: FormData) {
  const user = await requireAuth()
  const name = String(formData.get('name'))
  const slug = String(formData.get('slug'))
  await customersService.createOrganization({ name, slug, ownerUserId: user.id })
  revalidatePath('/admin/settings')
}

export async function inviteMemberAction(formData: FormData) {
  await requireAuth()
  const organizationId = String(formData.get('organizationId'))
  const email = String(formData.get('email'))
  await customersService.inviteMember({ organizationId, email })
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 2: Página de settings**

Crear `app/(admin)/settings/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import { createOrganizationAction, inviteMemberAction } from './actions'

export default async function SettingsPage() {
  const user = await requireAuth()
  const orgs = await customersService.listForUser(user.id)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-medium">Settings</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Your organizations</h2>
        {orgs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No organizations yet. Create one below.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {orgs.map((org) => (
              <li key={org.id} className="border rounded p-3 text-sm">
                <div className="font-medium">{org.name}</div>
                <div className="text-gray-500">/{org.slug} · {org.members.length} member(s)</div>
                <form action={inviteMemberAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="organizationId" value={org.id} />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="invite@example.com"
                    className="flex-1 px-3 py-1.5 border rounded text-sm"
                  />
                  <button type="submit" className="px-3 py-1.5 text-sm border rounded">
                    Invite
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Create organization</h2>
        <form action={createOrganizationAction} className="mt-4 space-y-3">
          <input name="name" required placeholder="Organization name" className="w-full px-3 py-2 border rounded text-sm" />
          <input name="slug" required placeholder="org-slug" pattern="[a-z0-9-]+" className="w-full px-3 py-2 border rounded text-sm" />
          <button
            type="submit"
            className="px-4 py-2 rounded text-white text-sm"
            style={{ background: 'var(--color-primary)' }}
          >
            Create
          </button>
        </form>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Verificar manualmente**

Hacer sign-in (con un email real si Resend está configurado, o desde Prisma Studio creando un user y una session manualmente). Ir a /admin/settings. Crear org. Invitar email.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin): settings page with create org and invite members"
```

---

### Task 24: Aceptar invitación

**Files:**
- Crear: `app/(auth)/invite/[token]/page.tsx`, `app/(auth)/invite/[token]/actions.ts`

- [ ] **Step 1: Server action de aceptar**

Crear `app/(auth)/invite/[token]/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'

export async function acceptInvitationAction(token: string) {
  const user = await requireAuth()
  await customersService.acceptInvitation({ token, userId: user.id })
  redirect('/admin/settings?accepted=1')
}
```

- [ ] **Step 2: Página de invitación**

Crear `app/(auth)/invite/[token]/page.tsx`:

```typescript
import { prisma } from '@/lib/db/client'
import { acceptInvitationAction } from './actions'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { organization: true }
  })

  if (!invitation) {
    return <div><h1 className="text-xl font-medium">Invitation not found</h1></div>
  }

  if (invitation.acceptedAt) {
    return <div><h1 className="text-xl font-medium">Already accepted</h1></div>
  }

  if (invitation.expiresAt < new Date()) {
    return <div><h1 className="text-xl font-medium">Invitation expired</h1></div>
  }

  async function accept() {
    'use server'
    await acceptInvitationAction(params.token)
  }

  return (
    <div>
      <h1 className="text-xl font-medium">Join {invitation.organization.name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        You have been invited to join as <strong>{invitation.role.toLowerCase()}</strong>.
      </p>
      <form action={accept} className="mt-6">
        <button
          type="submit"
          className="px-4 py-2 rounded text-white text-sm"
          style={{ background: 'var(--color-primary)' }}
        >
          Accept invitation
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(auth): accept invitation flow"
```

---

## Parte 7 — Observabilidad

### Task 25: Pino logger

**Files:**
- Crear: `lib/observability/logger.ts`

- [ ] **Step 1: Instalar Pino**

Run:
```bash
pnpm add pino pino-pretty
```

- [ ] **Step 2: Crear logger**

Crear `lib/observability/logger.ts`:

```typescript
import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined
})

export function withRequestContext(context: { requestId?: string; userId?: string; organizationId?: string }) {
  return logger.child(context)
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(observability): Pino structured logger"
```

---

### Task 26: Sentry server y cliente

**Files:**
- Crear: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`

- [ ] **Step 1: Instalar y ejecutar wizard**

Run:
```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs --saas
```

Cuando pregunte el DSN, ingresarlo (o dejarlo placeholder y configurar después).

- [ ] **Step 2: Verificar archivos creados**

El wizard crea `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` y modifica `next.config.ts` con `withSentryConfig`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(observability): integrate Sentry for error tracking"
```

---

### Task 27: Health endpoint

**Files:**
- Crear: `app/api/health/route.ts`

- [ ] **Step 1: Crear endpoint**

Crear `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ status: 'error', db: 'fail', error: String(error) }, { status: 503 })
  }
}
```

- [ ] **Step 2: Verificar**

Run:
```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","db":"ok",...}`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(observability): /api/health endpoint with DB check"
```

---

## Parte 8 — CI con GitHub Actions

### Task 28: Pipeline de CI

**Files:**
- Crear: `.github/workflows/ci.yml`

- [ ] **Step 1: Crear workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: online_store_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Enable pgvector
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -d online_store_test -c "CREATE EXTENSION IF NOT EXISTS vector;"

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Generate Prisma client
        run: pnpm exec prisma generate

      - name: Migrate test DB
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/online_store_test
        run: pnpm exec prisma migrate deploy

      - name: Unit tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/online_store_test
          NEXTAUTH_SECRET: test-secret-for-ci-only
          NEXTAUTH_URL: http://localhost:3000
        run: pnpm test

      - name: Build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/online_store_test
          NEXTAUTH_SECRET: test-secret-for-ci-only
          NEXTAUTH_URL: http://localhost:3000
        run: pnpm build
```

- [ ] **Step 2: Commit y push**

```bash
git add -A
git commit -m "ci: GitHub Actions workflow with lint, typecheck, tests, build"
git push origin main
```

- [ ] **Step 3: Verificar en GitHub**

Ir a github.com/<tu-usuario>/online-store/actions. Verificar que el workflow corrió y pasó.

---

## Parte 9 — Provisión del VPS Hetzner

### Task 29: Crear VPS en Hetzner

**Files:** ninguno local; trabajo en Hetzner Cloud Console

- [ ] **Step 1: Crear cuenta y proyecto**

Ir a https://www.hetzner.com/cloud. Crear cuenta. Crear un proyecto llamado "online-store".

- [ ] **Step 2: Generar par de llaves SSH**

Run en local:
```bash
ssh-keygen -t ed25519 -C "online-store-vps" -f ~/.ssh/online_store_hetzner
```

(Sin passphrase para automatización, o con passphrase si prefieres seguridad extra y usas ssh-agent.)

- [ ] **Step 3: Agregar llave pública a Hetzner**

En Hetzner Cloud → SSH Keys → Add SSH Key, pegar el contenido de:

```bash
cat ~/.ssh/online_store_hetzner.pub
```

Nombre: `mac-personal`.

- [ ] **Step 4: Crear servidor CX22**

En Hetzner Cloud → Add Server:
- Location: **Ashburn, VA (USA East)**
- Image: **Ubuntu 24.04**
- Type: **CX22** (Shared vCPU AMD, 2 vCPU, 4 GB RAM, 40 GB SSD)
- Networking: IPv4 + IPv6
- SSH Keys: seleccionar `mac-personal`
- Volumes: ninguno
- Firewalls: crear nuevo, abrir puertos 22, 80, 443, 6001, 8000
- Backups: activar (+$1.20/mes)
- Name: `online-store-prod`

Crear el servidor. Anotar el IP público.

- [ ] **Step 5: Probar acceso SSH**

Run:
```bash
ssh -i ~/.ssh/online_store_hetzner root@<IP_PUBLICO>
```

Expected: shell del VPS.

---

### Task 30: Hardening básico del VPS

**Files:** ninguno local; trabajo en el VPS

- [ ] **Step 1: Actualizar paquetes**

Dentro del VPS (vía SSH):

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades
```

- [ ] **Step 2: Configurar firewall UFW**

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 6001/tcp
ufw allow 8000/tcp
ufw --force enable
ufw status
```

- [ ] **Step 3: Configurar actualizaciones automáticas**

```bash
dpkg-reconfigure --priority=low unattended-upgrades
```

Aceptar defaults.

- [ ] **Step 4: Crear usuario no-root**

```bash
adduser deploy --disabled-password --gecos ""
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
```

- [ ] **Step 5: Desactivar login root por SSH**

Editar `/etc/ssh/sshd_config.d/99-hardening.conf`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
echo -e "PermitRootLogin no\nPasswordAuthentication no" > /etc/ssh/sshd_config.d/99-hardening.conf
systemctl restart ssh
```

- [ ] **Step 6: Probar login con usuario deploy**

En local:
```bash
ssh -i ~/.ssh/online_store_hetzner deploy@<IP_PUBLICO>
```

Expected: shell. Si funciona, salir y verificar que root ya NO puede.

---

### Task 31: Instalar Coolify

**Files:** ninguno local

- [ ] **Step 1: Ejecutar instalador oficial**

En el VPS como `deploy`:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Esperar ~5-10 minutos. Al final muestra una URL del dashboard de Coolify.

- [ ] **Step 2: Abrir dashboard**

Abrir en local: `http://<IP_PUBLICO>:8000`

- [ ] **Step 3: Crear cuenta admin de Coolify**

Registrarse con tu email. Esta es la primera cuenta y queda como admin.

- [ ] **Step 4: Configurar settings básicos**

En Coolify → Settings:
- Instance domain: dejar IP por ahora (después configuramos dominio).
- Public IPv4: confirmar.

---

### Task 32: Crear servicio Postgres en Coolify

- [ ] **Step 1: Project + Environment**

En Coolify dashboard → Add Project: `online-store`. Dentro, crear environment `production`.

- [ ] **Step 2: Resource Postgres**

Dentro del environment → New Resource → Database → PostgreSQL 16.
- Name: `postgres-prod`
- Connect via Public: NO (solo red interna de Coolify)
- Postgres User: `online_store`
- Postgres Password: generar uno fuerte (Coolify lo hace)
- Postgres DB: `online_store`

Deploy.

- [ ] **Step 3: Habilitar pgvector**

En Coolify → Postgres → Terminal:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 4: Anotar Internal URL**

En Coolify, la página del Postgres muestra "Connection String (Internal)". La copiamos para el siguiente paso. Formato:

```
postgres://online_store:<PASSWORD>@<container-name>:5432/online_store
```

---

### Task 33: Crear aplicación en Coolify desde GitHub

- [ ] **Step 1: Conectar GitHub**

En Coolify → Sources → Add Source → GitHub App. Seguir el flujo de instalación de la GitHub App de Coolify (autoriza acceso al repo `online-store`).

- [ ] **Step 2: New Application**

En el environment `production` → New Resource → Application → Public/Private repository → seleccionar `online-store`.
- Branch: `main`
- Build Pack: **Nixpacks** (auto-detecta Next.js)
- Port: `3000`

- [ ] **Step 3: Environment variables**

En la pestaña Environment Variables, agregar:

```
DATABASE_URL=<Internal URL del Postgres>
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=https://tu-dominio.com    # de momento http://<IP>:3000
RESEND_API_KEY=<de tu cuenta Resend>
RESEND_FROM_EMAIL=onboarding@resend.dev
SENTRY_DSN=<de tu proyecto Sentry>
NEXT_PUBLIC_SENTRY_DSN=<el mismo>
NODE_ENV=production
```

Marcar todas como "Build Variable" si el build las necesita.

- [ ] **Step 4: Build commands**

En la pestaña Build:
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build`
- Start command: `pnpm start`

- [ ] **Step 5: Deploy**

Click "Deploy". Esperar 3-5 minutos. Ver logs.

- [ ] **Step 6: Verificar**

Si la URL pública es `http://<IP_PUBLICO>:3000`, abrirla. Verificar que carga "Acme Wholesale".

- [ ] **Step 7: Probar health**

```bash
curl http://<IP_PUBLICO>:3000/api/health
```

Expected: `{"status":"ok","db":"ok",...}`

---

### Task 34: Configurar dominio y SSL

- [ ] **Step 1: Comprar/usar dominio**

Si ya tienes un dominio, usar uno. Si no, comprar uno barato (Namecheap, Cloudflare). Para esta guía asumimos `tu-dominio.com`.

- [ ] **Step 2: A record**

En el panel DNS del dominio, crear:
- A record: `@` → `<IP_PUBLICO_VPS>`
- A record: `www` → `<IP_PUBLICO_VPS>`

Esperar propagación (típicamente 5-30 minutos).

- [ ] **Step 3: Asignar dominio en Coolify**

En la aplicación → General → Domain: `https://tu-dominio.com,https://www.tu-dominio.com`

- [ ] **Step 4: Activar SSL**

Coolify automáticamente solicita certificado Let's Encrypt al ver el dominio. Verificar en la pestaña Logs.

- [ ] **Step 5: Verificar**

```bash
curl -I https://tu-dominio.com
```

Expected: `HTTP/2 200`.

- [ ] **Step 6: Actualizar NEXTAUTH_URL**

En Coolify → Environment Variables, cambiar `NEXTAUTH_URL` a `https://tu-dominio.com`. Re-deploy.

---

### Task 35: Backups automáticos de Postgres

- [ ] **Step 1: Activar backup en Coolify**

En el Postgres → Backups → Enable Scheduled Backups.
- Frequency: Daily at 3:00 AM UTC
- Retention: 7 days
- Destination: local volume

- [ ] **Step 2: (Opcional) Storage Box externo**

Para offsite, contratar un Hetzner Storage Box (~$3/mes para 100 GB). Coolify permite configurar S3-compatible destinations en próximas versiones; alternativamente correr un cron en el host que haga `rsync` del volumen de backups al Storage Box.

- [ ] **Step 3: Probar restore (dry run)**

En Coolify → Postgres → Backups, hacer click en "Download" de un backup reciente. Verificar que descarga un archivo `.tar.gz`.

- [ ] **Step 4: Documentar en runbook**

(Lo haremos en Task 37.)

---

## Parte 10 — Documentación

### Task 36: README del proyecto

**Files:**
- Crear: `README.md`

- [ ] **Step 1: Escribir README**

```markdown
# Online Store

Tienda B2B mayorista con IA — plantilla configurable multi-tenant.

## Stack

Next.js 14 · TypeScript · Tailwind + shadcn/ui · Auth.js v5 · Prisma · PostgreSQL 16 · pgvector · Hetzner VPS + Coolify

## Quick start (local)

Prerrequisitos: Node 20+, pnpm 9+, Docker Desktop, Git.

\`\`\`bash
git clone git@github.com:<tu-usuario>/online-store.git
cd online-store
pnpm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
docker compose up -d
pnpm exec prisma migrate dev
pnpm dev
\`\`\`

Abrir http://localhost:3000.

## Scripts

\`\`\`bash
pnpm dev           # Servidor de desarrollo
pnpm build         # Build de producción
pnpm test          # Tests unitarios
pnpm test:e2e      # Tests E2E con Playwright
pnpm lint          # Lint con Biome
pnpm typecheck     # TypeScript
\`\`\`

## Documentación

- `ROADMAP.md` — Visión general del proyecto y las 7 fases.
- `docs/specs/` — Specs de diseño por fase.
- `docs/plans/` — Planes de implementación por fase.
- `docs/runbooks/` — Operación, deploy, mantenimiento.
- `docs/adr/` — Decisiones de arquitectura.

## Configuración de la tienda

La tienda se configura desde dos archivos en la raíz:
- `store.config.ts` — Identidad, locales, módulos activos, pagos.
- `theme.config.ts` — Colores, tipografía, radios, densidad visual.

Cambiar estos archivos modifica el comportamiento y apariencia sin tocar código de aplicación.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: project README with quick start"
```

---

### Task 37: Runbooks

**Files:**
- Crear: `docs/runbooks/local-dev.md`, `docs/runbooks/deploy-rollback.md`, `docs/runbooks/vps-maintenance.md`, `docs/runbooks/backup-restore.md`

- [ ] **Step 1: local-dev.md**

```markdown
# Runbook · Desarrollo local

## Setup inicial

1. Instalar: Node 20+, pnpm 9+, Docker Desktop, Git.
2. Clonar repo y `cd online-store`.
3. `pnpm install`.
4. `cp .env.example .env.local` y rellenar valores.
5. `docker compose up -d` (levanta Postgres).
6. `pnpm exec prisma migrate dev` (aplica schema).
7. `pnpm dev` (arranca en localhost:3000).

## Generar NEXTAUTH_SECRET

\`\`\`bash
openssl rand -base64 32
\`\`\`

## Resetear DB local

\`\`\`bash
pnpm exec prisma migrate reset
\`\`\`

## Ver DB

\`\`\`bash
pnpm exec prisma studio
\`\`\`
```

- [ ] **Step 2: deploy-rollback.md**

```markdown
# Runbook · Deploy y rollback

## Deploy normal

Push a `main` → Coolify deploya automáticamente.

Monitoreo: Coolify dashboard → online-store-prod → Logs.

## Rollback

1. En Coolify → online-store-prod → Deployments.
2. Click en deployment anterior estable → "Redeploy this commit".
3. Esperar 3-5 minutos.
4. Verificar https://tu-dominio.com/api/health.

## Si el deploy falla a la mitad

1. Verificar logs en Coolify.
2. Comprobar variables de entorno.
3. Verificar que migración de Prisma no rompió.
4. Si DB queda mal: restaurar último backup (ver backup-restore.md).
```

- [ ] **Step 3: vps-maintenance.md**

```markdown
# Runbook · Mantenimiento del VPS

## Mensual

1. SSH al VPS: \`ssh -i ~/.ssh/online_store_hetzner deploy@<IP>\`
2. \`sudo apt update && sudo apt upgrade -y\`
3. Si pide reiniciar: \`sudo reboot\` (1 min de downtime).
4. Verificar Coolify sigue corriendo: \`docker ps | grep coolify\`.
5. Verificar app responde: \`curl https://tu-dominio.com/api/health\`.

## Cuando llegue CVE crítico

Reaccionar en horas, no días. Actualizar paquete específico y reiniciar.

## Si Coolify deja de responder

\`\`\`bash
sudo systemctl restart coolify
\`\`\`

Si persiste: ver \`/data/coolify/source/.env\` y logs en \`/data/coolify/logs/\`.
```

- [ ] **Step 4: backup-restore.md**

```markdown
# Runbook · Backup y restore de Postgres

## Backup manual

En Coolify → Postgres → Backups → Manual Backup.

## Restore desde backup

1. En Coolify → Postgres → Backups → seleccionar backup.
2. Click Restore → confirmar.
3. La app puede necesitar reinicio. Coolify lo hace automáticamente.
4. Verificar: \`curl https://tu-dominio.com/api/health\`.

## Probar restore en staging (recomendado mensual)

1. Descargar último backup de producción.
2. Crear DB temporal en local: \`docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16\`.
3. \`pg_restore -h localhost -p 5433 -U postgres -d postgres backup.tar.gz\`.
4. Verificar datos.
```

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/
git commit -m "docs: runbooks for local dev, deploy, maintenance, backups"
```

---

### Task 38: ADRs (Architecture Decision Records)

**Files:**
- Crear: `docs/adr/0001-single-app-vs-monorepo.md`, `docs/adr/0002-auth-nextauth-vs-clerk.md`, `docs/adr/0003-hetzner-coolify-vs-vercel.md`

- [ ] **Step 1: ADR 0001**

```markdown
# ADR 0001 · Single Next.js app en lugar de monorepo Turborepo

Status: Aceptado
Fecha: 2026-05-25

## Contexto
La plantilla apunta a ser multi-tenant con paquetes compartidos en Fase 6. Una opción era arrancar directamente con Turborepo; la otra, single app y refactorizar después.

## Decisión
Arrancar con single Next.js app. Organizar internamente en \`modules/\` para facilitar futura extracción a packages.

## Consecuencias
+ Velocidad de Fase 0.
+ Curva de aprendizaje menor.
- Refactor a monorepo en Fase 6 será trabajo dedicado (mitigado por disciplina de \`index.ts\` por módulo).
```

- [ ] **Step 2: ADR 0002**

```markdown
# ADR 0002 · Auth.js v5 en lugar de Clerk

Status: Aceptado
Fecha: 2026-05-25

## Contexto
Necesitamos auth con magic links y modelo de organizaciones B2B con roles.

## Decisión
Auth.js v5 (NextAuth) self-hosted. Modelar organizaciones en nuestra propia DB.

## Consecuencias
+ Cero costo recurrente.
+ Modelo de orgs 100% nuestro (control de roles, permisos, invitaciones).
+ Sin vendor lock-in.
- Más código a mantener vs Clerk listo de fábrica.

## Alternativas descartadas
- Clerk: $25+/mes/org, dependencia externa.
- Supabase Auth: requeriría usar Supabase como DB también.
- WorkOS: overkill para Fase 0, pensado para enterprise SSO.
```

- [ ] **Step 3: ADR 0003**

```markdown
# ADR 0003 · Hetzner VPS + Coolify en lugar de Vercel

Status: Aceptado
Fecha: 2026-05-25

## Contexto
Vercel ofrece la mejor DX pero (a) su Hobby plan no permite uso comercial, (b) Pro cuesta $20/mes/usuario, (c) hay vendor lock-in moderado.

## Decisión
Hetzner CX22 ($6/mes) en Ashburn USA East + Coolify (open-source, self-hosted).

## Consecuencias
+ Costo total ~$8-15/mes incluyendo DB, vs $40-80/mes en Vercel + Neon.
+ Autonomía total, sin vendor lock-in.
+ App en Docker estándar, portable a cualquier proveedor.
+ Latencia DB-app excelente (mismo host).
- Sysadmin responsabilidad nuestra (mitigado con actualizaciones automáticas y runbook mensual).
- Single point of failure (mitigado con backups diarios + monitoreo externo).

## Alternativas descartadas
- Vercel + Neon: licencia Hobby no es comercial, Pro $20+/mes/usuario.
- AWS Fargate + RDS: $50-150/mes al arrancar, 3 semanas de Fase 0 sólo en aprender AWS.
- Hostinger VPS: trampa de renovación, menos developer-grade.
- Laravel Cloud: requiere cambiar stack a PHP.
```

- [ ] **Step 4: Commit**

```bash
git add docs/adr/
git commit -m "docs: ADRs for stack and hosting decisions"
```

---

## Parte 11 — Validación final de Fase 0

### Task 39: Verificar criterios de aceptación

Recorrer la lista del spec y marcar cada uno:

- [ ] `pnpm install && pnpm dev` levanta el storefront en localhost:3000 sin errores.
- [ ] Una persona sin contexto puede seguir `docs/runbooks/local-dev.md` y tener todo corriendo en < 10 min.
- [ ] Editar `store.config.ts` (cambiar `identity.name`) se refleja en el header sin reiniciar.
- [ ] Editar `theme.config.ts` (cambiar `colors.primary`) cambia el color de botones en la app.
- [ ] Un usuario puede registrarse vía magic link, crear una organización e invitar a un segundo usuario.
- [ ] El segundo usuario recibe el email, abre `/invite/[token]` y queda como `BUYER` de la organización.
- [ ] Las rutas `/admin/*` requieren sesión válida y redirigen a `/sign-in` si no hay.
- [ ] CI corre en cada PR y bloquea el merge si lint, typecheck o tests fallan.
- [ ] Coolify deploya automáticamente al hacer push a `main`.
- [ ] Un error lanzado en producción aparece en Sentry con stack trace legible.
- [ ] `vitest run` y `playwright test` pasan en local y en CI.
- [ ] `pnpm build` produce un build de Next.js sin warnings críticos.
- [ ] El dominio carga con HTTPS y certificado válido.
- [ ] `/api/health` devuelve `{"status":"ok"}` en producción.

### Task 40: Cerrar Fase 0

- [ ] **Step 1: Actualizar ROADMAP.md**

Cambiar la fila de Fase 0 en la tabla de estado:

```
| 0 — Fundación | Completada | docs/specs/2026-05-25-fase-0-fundacion.md | docs/plans/2026-05-25-fase-0-fundacion-plan.md | ✅ |
```

- [ ] **Step 2: Tag de release**

```bash
git tag -a v0.1.0 -m "Phase 0: foundation"
git push origin v0.1.0
```

- [ ] **Step 3: Brainstormear Fase 1**

Invocar `superpowers:brainstorming` con el contexto de Fase 1 (Commerce core B2B): catálogo, carrito, checkout, órdenes, admin productos.

---

## Resumen del plan

**40 tasks** organizados en 11 partes:
1. Setup local (1-6)
2. Base de datos (7-9)
3. Sistema de configuración (10-13)
4. Autenticación (14-17)
5. Customers/Organizaciones con TDD (18-20)
6. Páginas admin (21-24)
7. Observabilidad (25-27)
8. CI (28)
9. VPS Hetzner + Coolify (29-35)
10. Documentación (36-38)
11. Validación final (39-40)

**Estimación realista:** Una persona dedicada full-time termina Fase 0 en 5-10 días laborales. Con dedicación parcial, 2-4 semanas.

**Commits objetivo:** ~40+ commits pequeños, uno por sub-tarea funcional.

---

*Plan listo para ejecución. Próximo paso: invocar `superpowers:subagent-driven-development` o `superpowers:executing-plans`.*
