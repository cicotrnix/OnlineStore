# ADR 0008 · Manejo de dinero: Decimal(12, 2) + lib/money.ts

- Status: Aceptado
- Fecha: 2026-05-26

## Contexto

JavaScript `number` es float64. Operaciones como `0.1 + 0.2 = 0.30000000000000004` rompen cualquier cálculo financiero. Acumulación de errores en ordenes con muchas líneas = facturas mal cuadradas.

## Decisión

- **Schema Prisma**: todos los campos de dinero son `Decimal @db.Decimal(12, 2)`. 12 dígitos totales, 2 decimales = rango `0.00` a `9,999,999,999.99`. Suficiente para B2B mayorista (orden máxima razonable < $1B).
- **Runtime**: usar `import { Decimal } from '@prisma/client/runtime/library'` para crear y operar. Nunca convertir a `number` excepto al final para `Intl.NumberFormat`.
- **Helpers centrales**: `lib/money.ts` expone `formatMoney(amount, currency)`, `addMoney(...)`, `multiplyMoney(amount, factor)`, `isPositiveMoney(amount)`. Single source of truth.

Convenciones:

- En Zod input: aceptar `z.number().positive().multipleOf(0.01)` (cliente envía JSON con float), convertir a `Decimal` en el service antes de persistir.
- En componentes React: recibir `Decimal` directamente y pasar por `formatMoney`.
- Nunca: sumar prices con `+`, multiplicar con `*`, comparar con `==`.

## Consecuencias

Positivas:
- Cálculos exactos. Sin acumulación de errores en órdenes de 100+ líneas.
- Un solo lugar para cambiar formato (Fase 5 introduce locale-aware formatting).

Negativas:
- Overhead de objects Decimal vs primitives. Irrelevante para escala B2B (no son hot loops).
- Devs nuevos deben aprender que `Decimal` no es `number`. TypeScript ayuda.

## Alternativas descartadas

- **`number`**: float bugs, descartado.
- **Bigint con cents**: serialización compleja, peor DX.
- **`Decimal.js` independiente**: Prisma ya bundlea `@prisma/client/runtime/library` con la misma lib (`decimal.js`); no añadir segunda dep.
