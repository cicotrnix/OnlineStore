# ADR 0002 · Auth.js v5 (NextAuth) en lugar de Clerk

- Status: Aceptado
- Fecha: 2026-05-25

## Contexto

Necesitamos autenticación con magic links (email) y un modelo de organizaciones B2B con roles (OWNER, ADMIN, BUYER, VIEWER) e invitaciones por token.

## Decisión

Auth.js v5 self-hosted con `@auth/prisma-adapter`. Modelar `Organization`, `OrganizationMember` e `Invitation` en nuestra propia DB. Magic links via Resend.

## Consecuencias

Positivas:

- Cero costo recurrente; escala sin sorpresas de facturación.
- Modelo de organizaciones 100% nuestro: control total de roles, permisos, lógica de invitaciones, multi-org por usuario.
- Sin vendor lock-in; cambiar de provider de email es un swap de `Resend(...)` por otro provider de Auth.js.
- Los datos viven en la misma DB que el resto del dominio — joins triviales con `OrganizationMember` y `User`.

Negativas:

- Más código a mantener (esquema, helpers, UI de invitación) vs. Clerk listo de fábrica.
- Magic links dependen de deliverability de Resend; mitigar con SPF/DKIM bien configurados.

## Alternativas descartadas

- **Clerk**: $25+/mes por org en plan B2B, dependencia externa, modelo de orgs fijo.
- **Supabase Auth**: forzaría usar Supabase como DB también.
- **WorkOS**: overkill para Fase 0; pensado para enterprise SSO.
