# Runbook — Append-only DB hardening (rol `app_rw`)

Estado: pendiente de provisión por ops (Coolify). El guard de Prisma ya bloquea
UPDATE/DELETE en JournalEntry/JournalLine/PaymentEvent/AuditLog (ADR 0033). Este
runbook agrega la defensa en profundidad a nivel de rol Postgres.

## Pre-requisitos

- Acceso superuser a la DB Postgres (rol `postgres` por default en Coolify).
- Password aleatorio fuerte para `app_rw` (ej: `openssl rand -base64 32`).
- Ventana de mantenimiento corta: la app debe reiniciarse con el nuevo
  `DATABASE_URL`.

## Pasos

1. Generar password:
   ```bash
   APP_RW_PASS=$(openssl rand -base64 32)
   echo "$APP_RW_PASS"  # guardalo en el password manager
   ```

2. Aplicar el script. La variable `:app_rw_password` se pasa con `-v`:
   ```bash
   psql "$DATABASE_URL_ADMIN" \
     -v app_rw_password="'$APP_RW_PASS'" \
     -f ops/sql/2026-06-01-create-app-rw-role.sql
   ```

3. Verificar que UPDATE/DELETE están revocados:
   ```sql
   SELECT grantee, table_name, privilege_type
   FROM information_schema.role_table_grants
   WHERE grantee = 'app_rw'
     AND table_name IN ('JournalEntry','JournalLine','PaymentEvent','AuditLog')
   ORDER BY table_name, privilege_type;
   ```
   El resultado debe mostrar solo `INSERT` y `SELECT`.

4. Actualizar `DATABASE_URL` en Coolify a usar `app_rw`:
   ```
   postgresql://app_rw:<APP_RW_PASS>@<host>:5432/<db>
   ```

5. Restart de la app. Verificar que `/api/health` responde 200.

6. Smoke test:
   - Login storefront.
   - Reload `/catalog`.
   - Tail logs por 5 min: que no aparezcan errores `permission denied`.

## Rollback

Si algo rompe (ej: una migración pendiente que la app necesita correr al boot —
la app no tiene CREATE TABLE en `app_rw`):

1. Restaurar `DATABASE_URL` al `postgres` superuser.
2. Restart app.
3. Investigar y patchear antes de re-aplicar.

Las migraciones Prisma deben correrse con `DATABASE_URL_ADMIN` (superuser) en el
deploy pipeline, no con `app_rw`. La app en runtime usa `app_rw`.

## Migraciones futuras

Cada migración nueva debe correr con superuser (DDL). El default-privileges del
script asegura que tablas nuevas heredan los grants base. Si una migración crea
otra tabla append-only:

1. Agregarla a `APPEND_ONLY_MODELS` en `lib/db/client.ts`.
2. Agregar `REVOKE UPDATE, DELETE` en un nuevo SQL script bajo `ops/sql/`.
3. Aplicar con superuser.

## Diagnóstico

Si la app emite `permission denied for table X`:
- Verificar que X no está en append-only por error (debería poder UPDATE).
- Si X es append-only: la app intentó un UPDATE/DELETE prohibido. El guard de
  Prisma debería haberlo bloqueado antes — investigar por qué no.
