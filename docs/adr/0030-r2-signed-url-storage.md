# ADR 0030 — Almacenamiento de documentos sensibles: R2 + URL firmada

Fecha: 2026-06-01 (Fase 5 Corte 1)

## Estado

Aceptado. Producción pendiente: cuenta R2 / Hetzner Object Storage.

## Contexto

Certificados de reventa (US_RESALE_CERT) y documentos equivalentes export son sensibles: contienen NIT/EIN, dirección física, número de licencia. No deben vivir en Postgres ni en filesystem público.

## Decisión

- **Interface `StorageClient`** en `lib/storage/index.ts`: `put(key, body) | get(key) | signedUrl(key, ttl)`.
- **FakeStorage in-memory** para tests + dev sin claves.
- **Producción: Cloudflare R2** (S3-compatible API). Alternativa Hetzner si latencia transatlántica importa.
- **URL firmada** (TTL 15 min) — solo admin puede generar. Frontend nunca ve el bucket directamente.
- **Cifrado en reposo** (server-side encryption del provider).
- **No CDN**: estos archivos no son públicos.

## Consecuencias

- Migración a S3/R2 cambia 1 archivo (`lib/storage/index.ts`). El módulo `verification` no toca código.
- Tests no requieren cuenta cloud.
- Costo R2: $0.015/GB-mes — negligible para volumen B2B.

## Alternativas descartadas

- Postgres bytea: blob storage en DB es anti-patrón + infla backups + rompe streaming.
- Local filesystem: no escala, no resistente a deploys Coolify, viola GDPR/PCI por compliance accidental.
