# Brief — Auditoría general del proyecto (2026-06-12)

> **Para Claude Code CLI.** Preparado en Cowork por Herney.
> Decide tú la metodología y los recursos (agentes, skills, thinking) que mejor sirvan al objetivo. Este brief define el qué, no el cómo.

## Objetivo

Auditoría completa y honesta de todo lo construido hasta ahora (Fases 0–5 cerradas, Fase 6 corte 0, rediseño UI en curso), con un veredicto claro: qué estamos haciendo bien, qué hay que cambiar ya, y si el rediseño "Back to 100%" es el camino correcto para esta tienda — o si conviene otro, dada su naturaleza.

## Contexto obligatorio

Leer antes de auditar: `CLAUDE.md`, `ROADMAP.md`, `docs/adr/` (0001–0033), specs y planes en `docs/specs/` y `docs/plans/`.
Naturaleza del negocio: **B2B mayorista de baterías (Pi-Power), USA+LATAM en USD, compradores profesionales que re-ordenan**; plantilla multi-tenant futura (Fase 6, modelo A deploy-por-tienda, dominio-como-datos).

## Qué auditar

1. **Arquitectura y dominio** — coherencia ADRs ↔ código real; módulos cerrados; bus de eventos; cuánto está realmente listo para Fase 6 (configurable vs hardcodeado).
2. **Calidad de código y deuda técnica** — duplicación, inconsistencias entre fases tempranas y tardías, manejo de errores, cumplimiento de convenciones de `CLAUDE.md`.
3. **Testing y CI** — ¿los 270+ tests prueban lo correcto o solo lo fácil? Coverage real en módulos de dinero, huecos e2e, los 6 tests skipped.
4. **Seguridad y dinero** — payments (qué falta para Stripe live), ledger append-only (¿burlable?), step-up OTP, rate limits in-memory en multi-instancia, authz B2B (impersonation, access filters en search/AI), `docs/psa-checklist.md` contra el código.
5. **Búsqueda e IA** — pipeline Meilisearch+Voyage+RRF, guardrails de AI content, enforcement B2B en tools del chatbot, presupuesto AiUsage, ¿algo sobre-ingenierizado para el catálogo actual?
6. **UX, producto y rediseño (lo más importante)** — evaluar "Back to 100%" (lima #88D810 + slate, instrument-grade, GSAP, branch `redesign/home`, PR #30) contra el comprador real B2B. Responder explícitamente: (a) ¿sirve al comprador B2B que re-ordena o optimiza para un retail que no tenemos?; (b) ¿el orden Home→i18n→catálogo→PDP→checkout es correcto o conviene priorizar re-orden/checkout?; (c) ¿GSAP/animaciones aportan o son riesgo de performance/WCAG 2.1 AA?; (d) veredicto: continuar / ajustar / cambiar camino, con argumentos.

## Reglas

- **Read-only**: no tocar código de producción ni abrir PRs de fixes; único commit permitido es el informe.
- Antes de auditar, correr y guardar como evidencia: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Ningún hallazgo sin evidencia (`archivo:línea` u output de comando). Verificar los claims importantes contra el código antes de afirmarlos — nada de hallazgos especulativos.
- No "todo está bien": mínimo 5 hallazgos y 3 fortalezas confirmadas por área.
- Si aparece un P0 de seguridad/dinero, va al inicio del veredicto ejecutivo.

## Entregable

**`docs/audit/2026-06-12-audit.md`** con:

1. Veredicto ejecutivo (≤1 página): qué va bien, qué cambiar ya, semáforo por área.
2. Veredicto del rediseño: continuar / ajustar / cambiar camino, argumentado.
3. Hallazgos P0–P3 verificados, con evidencia.
4. Puntos donde haya tensión o duda estratégica (los decide Herney en Cowork).
5. Top 10 acciones recomendadas en orden, con esfuerzo estimado.
6. Apéndice: evidencia de gates y material de soporte (en `docs/audit/2026-06-12/` si hay archivos extra).

Commit único: `docs: auditoría general 2026-06-12`. Al terminar, avisar que está lista para revisión en Cowork.
