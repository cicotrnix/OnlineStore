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

Régimen aplicable: **IATA PI966 Section II / 49 CFR 173.185 Section II**
(standalone lithium-ion UN3480). Permite ground sin DGD si:

- ≤8 cells o ≤2 batteries por paquete
- ≤100 Wh por batería, ≤2.7 Wh por celda
- ≤5 kg gross por paquete
- Lithium battery handling label en el paquete (manual ops)

Para PiPower (batería iPhone single-cell ~10 Wh):
- `HAZMAT_LIMITS.maxCells = 8`
- `HAZMAT_LIMITS.maxWattHours = 80`

Sobre límite → `HAZMAT_LIMIT_CELLS` / `HAZMAT_LIMIT_WH` error en cotización.
La org debe partir el pedido en múltiples paquetes o coordinar manual con
ops (PI966 Section IB requiere DGD + entrenamiento DG, no automatizado v1).

Restricción enforced: solo Ground (no Air). FedEx API limitado a `FEDEX_GROUND`.
La API real envía `specialServicesRequested: { specialServiceTypes:
['DANGEROUS_GOODS'] }` cuando `hazmat=true`.

Revalidar valores anual con cada update de IATA DGR / 49 CFR.

## Rotar FEDEX_API_KEY

1. Coolify: actualizar `FEDEX_API_KEY` + `FEDEX_ACCOUNT_NUMBER`.
2. Worker reinicia automáticamente.
3. Verificar próximo `quoteShipment` no rechaza.

## Sin FEDEX_API_KEY

`getFedexClient()` retorna `FakeFedex` — Útil para staging. Las etiquetas son ficticias (`FX...` random); no se pueden imprimir.
