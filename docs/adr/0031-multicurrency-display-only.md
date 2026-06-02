# ADR 0031 — Multimoneda informativa (display only)

Fecha: 2026-06-01 (Fase 5)

## Estado

Aceptado.

## Contexto

PiPower opera USD para B2B doméstico + export. Clientes LatAm preguntan precios en moneda local. Soportar multimoneda transaccional (FX en el ledger) introduce complejidad enorme: hedging, reconciliación FX, ajustes de redondeo, regulación cambiaria.

## Decisión

- **Transacciones, ledger, facturas, pagos: USD exclusivo**. `Order.currency='USD'`, `Payment.currency='USD'`, `JournalLine.currency='USD'`.
- **Display informativo**: el storefront puede mostrar un equivalente en moneda local del browser usando tasa de referencia (ECB/Frankfurter), cacheada **diariamente**. Sin afectar la base contable.
- **No persistir** la tasa visualizada — solo cálculo on-render para evitar arrastre de bugs históricos.
- Bandera futura `display.localCurrency=true` en `store.config.ts` controla la visibilidad (Corte 6+).

## Consecuencias

- Cero exposición a FX risk.
- Cero asientos de "diferencia de cambio" en el ledger.
- Si en el futuro Herney quiere cobrar en MXN: nuevo ADR + rediseño del Payment/Ledger.

## Alternativas descartadas

- FX en el ledger: complejidad regulatoria + tax reporting multipaís.
- Multi-moneda en Payment con conversión: arrastra inconsistencias entre rate-quoted-at vs rate-charged-at.
