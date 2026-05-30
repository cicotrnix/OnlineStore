-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "AiContentJob" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AiContentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiContentJob_status_enqueuedAt_idx" ON "AiContentJob"("status", "enqueuedAt");

-- CreateIndex
CREATE INDEX "AiContentJob_productId_idx" ON "AiContentJob"("productId");
