# Runbook · Deploy y rollback

Stack de producción: Hetzner VPS CX22 + Coolify.

## Deploy normal

Push a `main` → Coolify deploya automáticamente vía webhook.

Monitoreo: dashboard Coolify → `online-store-prod` → Logs.

Verificación post-deploy:

```bash
curl -s https://<dominio>/api/health
# {"status":"ok","db":"ok","timestamp":"..."}
```

## Rollback

1. Coolify → `online-store-prod` → Deployments.
2. Localizar el último deploy estable y "Redeploy this commit".
3. Esperar 3–5 min.
4. Verificar `/api/health` y sentir el sitio en navegador.

## Deploy falla a la mitad

1. Revisar logs en Coolify.
2. Verificar variables de entorno (`DATABASE_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`).
3. Si falla la migración Prisma:
   - Si la DB quedó en estado intermedio → restaurar último backup (ver `backup-restore.md`).
   - Si no afectó datos → corregir migración y re-push.

## Forzar rebuild sin nuevo commit

Coolify → `online-store-prod` → "Redeploy".

## Rotar `NEXTAUTH_SECRET`

1. Generar nuevo: `openssl rand -base64 32`.
2. Actualizar en Coolify (env vars) y redeploy.
3. Todas las sesiones activas quedan invalidadas.
