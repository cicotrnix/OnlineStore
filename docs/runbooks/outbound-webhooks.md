# Runbook — Webhooks salientes

## Configuración

Crear `WebhookEndpoint` para integraciones externas:

```ts
await prisma.webhookEndpoint.create({
  data: {
    organizationId: '<opcional>',
    url: 'https://customer.example/webhooks/pipower',
    secret: '<32-byte random>',
    events: ['order.placed', 'shipment.dispatched'],
    description: 'Customer ERP integration',
  },
})
```

Secret rotación: simplemente UPDATE `secret`. Futuras entregas firman con el nuevo.

## Operación

Worker: `pnpm tsx scripts/process-webhook-deliveries.ts` — cron 1 min.

Métricas:
```sql
SELECT status, COUNT(*) FROM "WebhookDelivery" GROUP BY status;
```
- `FAILED > 0`: investigar `lastError`. Replay con `replayDelivery(id)`.

## Subset público de eventos

Solo estos eventos se entregan (whitelist en `modules/webhooks/subscriber.ts`):
- `order.placed`
- `payment.captured` / `payment.reconciled` / `payment.refunded`
- `shipment.dispatched`
- `invoice.issued` / `invoice.paid` / `invoice.overdue`

`payment.failed` y `payment.authorized` NO se exponen (info-only interna).

## Firma HMAC

Cliente verifica con:
```python
import hmac, hashlib
expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
signature_header = request.headers['X-Webhook-Signature']  # 'sha256=<hex>'
assert hmac.compare_digest(f'sha256={expected}', signature_header)
```

## Replay

Admin UI futuro: lista de FAILED deliveries con botón "Replay".

CLI temporal:
```ts
import { replayDelivery } from '@/modules/webhooks'
await replayDelivery('<deliveryId>')
```

## Throttling

No implementado en v1. Si un endpoint cliente colapsa por volumen, el retry MAX=5 le da espacio. Para volúmenes mayores agregar rate-limit por endpoint en Fase 6.
