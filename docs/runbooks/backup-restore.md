# Runbook · Backup y restore de Postgres

## Estrategia

- Backup automático diario por Coolify (retención 14 días).
- Backup adicional manual antes de cualquier migración riesgosa.
- Restore probado al menos 1 vez por trimestre.

## Backup manual

```bash
ssh root@<ip>
docker exec coolify-postgres-prod pg_dump -U postgres online_store > /backups/online_store-$(date +%F).sql
```

## Restore

1. Detener la app en Coolify (evita writes durante el restore).
2. Subir el dump al VPS si no está ya.
3. Restaurar:

```bash
docker exec -i coolify-postgres-prod psql -U postgres -d postgres -c "DROP DATABASE online_store;"
docker exec -i coolify-postgres-prod psql -U postgres -d postgres -c "CREATE DATABASE online_store;"
docker exec -i coolify-postgres-prod psql -U postgres online_store < /backups/online_store-2026-05-25.sql
```

4. Re-aplicar extensión pgvector si no se incluyó:

```bash
docker exec coolify-postgres-prod psql -U postgres online_store -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

5. Re-arrancar la app en Coolify.
6. Verificar `/api/health` y un par de queries clave.

## Backup off-site

Coolify sube backups a S3 (Hetzner Storage Box o R2). Configurar en `Backups → Settings`.
