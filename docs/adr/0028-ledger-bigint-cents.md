# ADR 0028 — Libro mayor en enteros BIGINT centavos

Fecha: 2026-06-01 (Fase 5 Corte 3)

## Estado

Aceptado.

## Contexto

ADR 0008 establece `Decimal(12,2)` para Order/Quote/Invoice/Payment — adecuado para precios y catálogo. El ledger contable tiene una restricción más estricta: los asientos deben balancear **exactamente al centavo**. Aritmética Decimal de Prisma cumple, pero JavaScript la maneja como `Decimal.js` con redondeo configurable. La probabilidad de bugs sutiles (ej: dividir-luego-multiplicar) crece con cada regla de posteo.

## Decisión

Ledger usa `BigInt` en centavos:

- `JournalLine.debitCents` y `creditCents`: `BigInt @default(0)`.
- `Payment.amountCents`: `BigInt` (Corte 2).
- `Shipment.rateCents`: `BigInt` (Corte 4).
- Conversión Decimal→cents ocurre en el borde (cuando un evento `invoice.issued` carga payload).
- Helper `decimalToCents(d): number` en `modules/payments/service.ts` parsea `"5000.00" → 500000`.

## Consecuencias

- Cero ambigüedad de redondeo en el ledger.
- Property test "débitos = créditos" pasa de forma trivial con BigInt addition.
- Costo: serialización (BigInt no es JSON-nativo) requiere `String(n)` al exponer en APIs públicas.

## Alternativas descartadas

- Mantener Decimal en ledger: redondeo silencioso posible. Una orden de $33.33 reembolsada en 3 partes podría no cuadrar.
- Strings: pierde semántica numérica + cada operación requiere parse.
