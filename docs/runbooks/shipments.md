# Runbook — Envíos (FedEx + Miami forwarder)

## USA Ground

1. Order CONFIRMED → admin cotiza via `quoteShipment({orderId, fromZip, weightLbs, hazmat?, hazmatCells?, hazmatWattHours?})`.
2. Rate quote almacenado en `Shipment.rateCents`.
3. Admin compra etiqueta via `dispatchShipment({shipmentId, fromAddress, weightLbs})`.
4. Sistema emite `shipment.dispatched` → email + analytics + webhook.

## Export Miami forwarder

1. Order CONFIRMED con `shippingAddress.country != 'US'`.
2. `quoteShipment` marca `Shipment.isExport=true`, NO cotiza con FedEx.
3. Admin coordina con cliente: dirección del forwarder en Miami.
4. Admin actualiza `shippingAddress` o `Shipment.forwarderRef`.
5. Despacho doméstico a Miami via flujo normal.
6. Cliente final gestiona el envío internacional.

## Hazmat litio (clase 9)

Límites por paquete (config en `HAZMAT_LIMITS`):
- `maxCells = 100`
- `maxWattHours = 300`

Valores a ajustar con ops según paperwork DG actual. Sobre límite → `HAZMAT_LIMIT_*` error en cotización.

Restricción enforced: solo Ground (no Air). FedEx API limitado a `FEDEX_GROUND`.

## Rotar FEDEX_API_KEY

1. Coolify: actualizar `FEDEX_API_KEY` + `FEDEX_ACCOUNT_NUMBER`.
2. Worker reinicia automáticamente.
3. Verificar próximo `quoteShipment` no rechaza.

## Sin FEDEX_API_KEY

`getFedexClient()` retorna `FakeFedex` — Útil para staging. Las etiquetas son ficticias (`FX...` random); no se pueden imprimir.
