-- ============================================================================
-- Fase 5 hardening: rol Postgres app_rw con grants restringidos
-- ============================================================================
--
-- Objetivo: el usuario que corre la app (Coolify/Hetzner) no debe poder hacer
-- UPDATE/DELETE en tablas append-only. El guard de Prisma (lib/db/client.ts)
-- ya bloquea esto en la app, pero el rol DB es la última línea de defensa
-- si la app es comprometida o un atacante obtiene credenciales.
--
-- Tablas append-only (ADR 0033):
--   - JournalEntry
--   - JournalLine
--   - PaymentEvent
--   - AuditLog
--
-- Cómo correrlo:
--   psql "$DATABASE_URL_ADMIN" -f ops/sql/2026-06-01-create-app-rw-role.sql
--
-- DATABASE_URL_ADMIN debe ser una conexión con rol superuser (postgres). El
-- DATABASE_URL de la app pasa a usar app_rw después.
--
-- IMPORTANTE: ejecutarlo en una ventana de mantenimiento corta porque cambia
-- el rol que usa la app — la app debe reiniciarse con el nuevo DATABASE_URL.

BEGIN;

-- 1) Crear el rol con password (Herney debe generar uno y pasarlo en env).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    -- Password placeholder — Herney reemplaza con secreto real antes de correr.
    CREATE ROLE app_rw WITH LOGIN PASSWORD :'app_rw_password';
  END IF;
END $$;

-- 2) Permisos base sobre el schema.
GRANT CONNECT ON DATABASE current_database() TO app_rw;
GRANT USAGE  ON SCHEMA public TO app_rw;

-- 3) Permisos por default a tablas existentes: SELECT/INSERT/UPDATE/DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- 4) Default privileges para tablas nuevas (futuras migraciones).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT                  ON SEQUENCES TO app_rw;

-- 5) REVOCAR UPDATE/DELETE en append-only.
--    DomainEvent NO está acá porque su `status` muta (PENDING→PROCESSING→DONE).
REVOKE UPDATE, DELETE ON "JournalEntry"  FROM app_rw;
REVOKE UPDATE, DELETE ON "JournalLine"   FROM app_rw;
REVOKE UPDATE, DELETE ON "PaymentEvent"  FROM app_rw;
REVOKE UPDATE, DELETE ON "AuditLog"      FROM app_rw;

-- 6) Verificación: las 4 tablas no deben tener UPDATE/DELETE.
-- Ejecutar manual después de COMMIT:
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'app_rw' AND table_name IN
--     ('JournalEntry','JournalLine','PaymentEvent','AuditLog')
--   ORDER BY table_name, privilege_type;

COMMIT;
