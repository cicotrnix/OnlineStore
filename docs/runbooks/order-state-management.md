# Runbook · Gestión de órdenes

Cómo el platform admin maneja órdenes desde `/admin/orders`.

## Estados de orden

```
PENDING_PAYMENT  →  CONFIRMED  →  SHIPPED  →  DELIVERED
        ↓               ↓
    CANCELLED       CANCELLED
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|-------------------------|
| `PENDING_PAYMENT` | Recién colocada, esperando confirmación de pago (en Fase 1 no hay procesador real). | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Pago verificado, lista para preparar. | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | Salió del centro de distribución. | `DELIVERED` |
| `DELIVERED` | Cliente recibió. Terminal. | — |
| `CANCELLED` | Cancelada manualmente. Stock restaurado. Terminal. | — |

## Confirmar pago manual

En Fase 1 no hay integración Stripe. Confirmación es manual:

1. `/admin/orders/[id]`.
2. Click "→ CONFIRMED".
3. `Order.confirmedAt` se llena con timestamp.

## Cancelar orden

Solo desde `PENDING_PAYMENT` o `CONFIRMED`. Una vez `SHIPPED` ya no se cancela (logística externa).

Acción `cancelOrderAction`:

1. `SELECT FOR UPDATE` sobre `Product` referenciados.
2. Para cada `OrderLine`: `Product.stockQuantity += quantity`.
3. `Order.status = CANCELLED`, `cancelledAt = now()`, `cancelledByUserId = currentAdmin.id`.
4. Atómica: si falla, ningún stock se restaura.

## Verificar stock restaurado

Después de cancelar:

```sql
SELECT id, name, "stockQuantity" FROM "Product" WHERE id IN (...);
```

Debe coincidir con el stock previo + qty cancelada.

## Casos especiales

- **`DELIVERED` reportada con error**: no hay reversión. Resolver vía nueva orden de crédito (futuro Fase 5+).
- **`CANCELLED` cuando el cliente ya recibió**: no debería ocurrir (state machine bloquea). Si pasa: investigar logs y corregir manualmente con SQL + auditar quién forzó la transición.
- **Stock negativo después de cancelar**: imposible — `increment` de Postgres no puede bajar de 0 sin operación explícita. Si aparece, hay corrupción y se debe restaurar de backup.
