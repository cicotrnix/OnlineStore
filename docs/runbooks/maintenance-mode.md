# Runbook — Modo mantenimiento

## Cómo funciona

Edge middleware (`middleware.ts`) bloquea TODO el sitio con 503 + página
"Próximamente" + `X-Robots-Tag: noindex` cuando `MAINTENANCE_MODE=on`.

**Default seguro**: sin la env var (o con cualquier valor que no sea `'on'`),
el sitio funciona normal — un deploy no bloquea por accidente.

## Encender mantenimiento

1. En Coolify (Application → Env vars):
   ```
   MAINTENANCE_MODE=on
   MAINTENANCE_BYPASS_KEY=<algo-random-32-bytes>
   ```
   Generar la key: `openssl rand -base64 32` (o cualquier secreto fuerte).

2. Reiniciar la app. Coolify dispara nuevo deploy.

3. Verificar:
   - `curl -I https://<host>/` → `HTTP/2 503`
   - Header `X-Robots-Tag: noindex, nofollow` presente.
   - Body contiene "PiPower" + "Estamos preparando la tienda mayorista".

## Bypass (owner + testers)

Compartir link **uno-a-uno** (no público):

```
https://<host>/unlock?key=<MAINTENANCE_BYPASS_KEY>
```

Al visitar:
- Setea cookie `maint_bypass` httpOnly firmada (HMAC sha256 del payload bajo
  la key) válida 30 días.
- Redirige a `/`. El middleware acepta la cookie y pasa.

Si la key es incorrecta o falta: 404 (oculta el flow).

## Apagar mantenimiento

1. Coolify: `MAINTENANCE_MODE=off` (o borrar la env var).
2. Reiniciar app.
3. Verificar: `curl -I https://<host>/` → `HTTP/2 200`.

## Borrar bypass propio (limpiar cookie)

`https://<host>/unlock?clear=1` → borra la cookie. Útil al testear el flow
real desde la misma máquina del owner.

## Rotar la key

Cambiar `MAINTENANCE_BYPASS_KEY` en Coolify → reiniciar. Todas las cookies
existentes quedan inválidas automáticamente (HMAC bajo otra key no verifica).
Hay que repartir el nuevo link.

## Paths exentos del gate (siempre pasan)

- `/api/health` — uptime checks
- `/api/webhooks/*` — Stripe, FedEx, etc. La firma HMAC del payload es la
  seguridad real; no podemos bloquearlos durante mantenimiento porque
  perderíamos eventos.
- `/_next/*` — assets compilados por Next
- `/favicon.ico`, `/favicon.svg`, `/icon.svg`, `/logo-pipower.png` — assets
  estáticos referenciados por la página de mantenimiento.
- `/robots.txt`, `/sitemap.xml` — SEO (aunque con noindex global no importa
  demasiado, evitamos romper el crawler de Google si hace fetch).
- `/unlock` — la propia ruta del bypass.

## Verificación post-deploy

```bash
# Esperado en mantenimiento:
curl -sI https://<host>/                  | grep -E "HTTP|X-Robots"  # 503 + noindex
curl -sI https://<host>/api/health        | grep HTTP                # 200
curl -sI https://<host>/api/webhooks/stripe -X POST | grep HTTP      # 400 (firma inválida, pero NO 503)

# Bypass funciona:
curl -sI -L "https://<host>/unlock?key=<KEY>" | grep -E "HTTP|Set-Cookie"
# 307 + cookie maint_bypass

# Apagado:
curl -sI https://<host>/  | grep HTTP                                # 200
```

## Troubleshooting

- **503 en /api/webhooks/stripe** — Bug crítico. El matcher en `middleware.ts`
  debe excluir `api/webhooks`. Verificar el regex.
- **Cookie no persiste** — Browser bloqueó la cookie. Confirmar HTTPS en prod
  (la cookie es `secure: true` si `protocol === 'https:'`).
- **Cualquier MAINTENANCE_MODE distinto a 'on' apaga el modo** — Por diseño.
  No usar `MAINTENANCE_MODE=true` (no funciona). Sólo el literal `'on'`.
