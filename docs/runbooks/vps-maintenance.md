# Runbook · Mantenimiento del VPS

VPS: Hetzner CX22 (Ashburn USA East), 2 vCPU / 4 GB RAM / 40 GB NVMe.

## Mensual

```bash
ssh root@<ip>
apt update && apt upgrade -y
unattended-upgrades --dry-run    # verificar que esté activo
docker system prune -af          # liberar espacio
df -h                            # comprobar disco
```

## Coolify

- `coolify` se actualiza desde su propia UI (Settings → Update).
- Backup de la config: `~/coolify` contiene todo el estado.

## Postgres

- Backup diario automático (ver `backup-restore.md`).
- `vacuum analyze` corre por autovacuum; no es necesario tocar.

## Alertas

- Uptime Kuma externo verifica `/api/health` cada minuto.
- Sentry alerta por errores > umbral.

## Acceso SSH

- Solo por clave pública, password disabled.
- Root login disabled en `/etc/ssh/sshd_config`.
- Fail2ban activo.

## Renovar SSL

Coolify maneja Let's Encrypt automáticamente. Si falla:

```bash
docker exec coolify caddy reload
```
