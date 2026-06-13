-- ADR 0036: stock reservado en placeOrder + ventana de pago para órdenes wire.
-- Tras paymentDueAt sin pago, el cron cancel-stale-pending-orders libera stock.
ALTER TABLE "Order" ADD COLUMN "paymentDueAt" TIMESTAMP(3);
