# ADR 0029 — Contabilidad doble partida, base devengado, append-only

Fecha: 2026-06-01 (Fase 5 Corte 3)

## Estado

Aceptado.

## Contexto

Spec Fase 5 §6a: contabilidad propia (no QuickBooks) en Nivel 2 (libro mayor, balance, P&L), base devengado, USD, append-only. Necesidad: reportes correctos para SRI/SAT/IRS sin depender de ERP externo.

## Decisión

- **Doble partida**: cada evento posteable produce `JournalEntry` con N≥2 `JournalLine` donde `sum(debits) === sum(credits)`. Property test cubre 100 valores aleatorios × 4 reglas (`invoice.issued`, `payment.captured`, `payment.reconciled`, `payment.refunded`).
- **Devengado (accrual)**: reconoce ingreso al emitir factura, lleva CxC, no espera al cobro.
- **Append-only enforcement a nivel app**: `lib/db/client.ts` extiende Prisma con guard que bloquea `update/updateMany/delete/deleteMany/upsert` en `JournalEntry`, `JournalLine`, `PaymentEvent`. Correcciones via asientos reversores (`JournalEntry.reversesId`). Hardening adicional vía rol Postgres `app_rw` (ver §13 spec).
- **Períodos contables**: `AccountingPeriod(year, month, status)`. `ensureOpenPeriod` upserta + valida; posteo en CLOSED → throw. `closePeriod` requiere step-up auth (admin sensitive action).
- **Idempotencia por `eventId`**: `JournalEntry.eventId UNIQUE`. Replay de eventos no duplica asientos.
- **Refunds via contra-ingreso (no reapertura de CxC)**: `payment.refunded` postea Dr **4100 Devoluciones sobre ventas** (REVENUE normalSide DEBIT) / Cr cuenta de clearing/banco según método (`STRIPE_CARD` → 1200, `WIRE`/`ACH` → 1010). Revenue neto = 4000 Cr − 4100 Dr. CxC no se toca en el reverso porque ya fue cancelada en la captura.

## Consecuencias

- Auditoría limpia. Forensics directo via `JournalEntry.eventId` ← reverse lookup al evento original.
- Cerrar el mes congela los reportes.
- Cambios de regla de posteo NO afectan asientos pasados (no se re-postean).

## Alternativas descartadas

- Nivel 1 (libro de caja): no permite balance general; insuficiente para tax compliance multi-jurisdicción.
- Base efectivo: distorsiona márgenes; un wire con factura previa no respeta el principio de devengado.
- UPDATE para corregir errores: rompe append-only + dificulta auditoría externa.
