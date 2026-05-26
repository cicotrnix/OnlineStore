# ADR 0006 · Diseño de impersonation

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

Soporte B2B real necesita "ver como cliente X" para verificar precios negociados, revisar catálogo según contexto del cliente, replicar bugs reportados. Esto NO es login-as: el admin sigue siendo el admin, solo cambia el `orgId` que dispara pricing y catalog.

## Decisión

Modelo:

- `Session.impersonatingOrgId String?` — si no-null, todas las lecturas de pricing/catalog usan esa orgId en lugar de `Session.activeOrgId`.
- `Session.lastSeenAt DateTime` — actualizado en cada request por `lib/auth/middleware.ts`.
- `ImpersonationLog(adminUserId, targetOrgId, action: START|STOP, reason?, createdAt)` — audit.

Reglas:

- Sólo `User.isPlatformAdmin = true` puede invocar `impersonationStart`.
- Mientras `impersonatingOrgId` está activa: cart mutations bloqueadas (server actions + tRPC procedure throw).
- Banner amarillo persistente en `(storefront)/layout.tsx` muestra org actual + botón "Salir".
- Auto-expira: si `now - lastSeenAt > 30 min`, middleware limpia `impersonatingOrgId` e inserta `ImpersonationLog` con `reason: "auto-expired"`.
- Logout limpia ambos campos.

## Consecuencias

Positivas:
- Identidad admin nunca se pierde (siempre auditable en `Session.userId`).
- Pricing/catálogo se renderiza fielmente como lo vería el cliente.
- Sin riesgo de colocar órdenes accidentales por el admin.
- Audit log permite responder "quién impersonó a quién, cuándo, por qué".

Negativas:
- Middleware ejecuta `prisma.session.update` en cada request — pequeño costo en latencia. Mitigación: índice en `Session.sessionToken` (ya unique).
- Multi-tab: 2 tabs comparten Session = comparten estado de impersonation. UX OK (al cambiar en una tab, refresh de la otra refleja).
- Multi-dispositivo: cada device es su propia Session. Acción en laptop no se propaga a phone hasta refresh de sesión.

## Alternativas descartadas

- **JWT custom claim**: imposible auditar sin DB log.
- **Session swap (login as)**: pierde identidad admin, dificulta audit.
- **Read-only flag por path**: no cubre el caso de "ver como org X".
