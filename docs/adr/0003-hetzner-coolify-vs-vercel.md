# ADR 0003 · Hetzner VPS + Coolify en lugar de Vercel

- Status: Aceptado
- Fecha: 2026-05-25

## Contexto

Necesitamos hostear la app Next.js + Postgres + (futuro) Meilisearch y workers ligeros. La tienda opera en USD para USA + LATAM, queremos baja latencia para USA East.

## Decisión

Hetzner VPS CX22 (2 vCPU / 4 GB / 40 GB NVMe, Ashburn) + Coolify open-source para orquestar Docker. Postgres self-hosted en el mismo VPS. Deploys vía webhook desde GitHub a Coolify.

## Consecuencias

Positivas:

- Costo predecible (~$6/mes vs. Vercel Pro $20+/mes y Neon $19+ por DB).
- Sin cuotas mensuales de bandwidth/build-min.
- Portabilidad total — todo es Docker, se mueve a otro VPS en una tarde.
- Postgres + pgvector en la misma red privada que la app — latencia mínima para queries vectoriales.

Negativas:

- Sin preview deploys gratis por PR (mitigación: Coolify soporta preview environments si activamos rama → subdominio).
- Responsable de patching del SO (`unattended-upgrades` mitiga el grueso).
- Sin edge runtime global — irrelevante hasta tener tráfico distribuido fuera de USA.

## Alternativas descartadas

- **Vercel + Neon**: costo escala mal con tráfico; Neon limita conexiones en plan free; vendor lock-in en build pipeline.
- **Fly.io**: bueno para edge pero más caro a este tamaño.
- **Render**: similar a Vercel en costo, sin la diferenciación.
