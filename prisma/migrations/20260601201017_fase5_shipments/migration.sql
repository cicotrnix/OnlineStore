-- CreateEnum
CREATE TYPE "ShipmentCarrier" AS ENUM ('FEDEX', 'PICKUP');

-- CreateEnum
CREATE TYPE "ShipmentService" AS ENUM ('FEDEX_GROUND', 'FEDEX_HOME_DELIVERY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'RATE_QUOTED', 'LABEL_PURCHASED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" "ShipmentCarrier" NOT NULL DEFAULT 'FEDEX',
    "service" "ShipmentService" NOT NULL DEFAULT 'FEDEX_GROUND',
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "isExport" BOOLEAN NOT NULL DEFAULT false,
    "forwarderRef" TEXT,
    "hazmat" BOOLEAN NOT NULL DEFAULT false,
    "hazmatCells" INTEGER,
    "hazmatWattHours" INTEGER,
    "rateCents" BIGINT,
    "rateCurrency" TEXT NOT NULL DEFAULT 'USD',
    "rateQuotedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "labelUrl" TEXT,
    "labelPurchasedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
