-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CAPTURED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_RECONCILED';
ALTER TYPE "NotificationType" ADD VALUE 'INVOICE_ISSUED';
ALTER TYPE "NotificationType" ADD VALUE 'SHIPMENT_DISPATCHED';
