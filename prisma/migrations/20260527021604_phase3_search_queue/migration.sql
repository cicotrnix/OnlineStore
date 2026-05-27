-- CreateEnum
CREATE TYPE "SearchIndexAction" AS ENUM ('UPSERT', 'DELETE');

-- CreateEnum
CREATE TYPE "SearchIndexStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "embedding" vector(512),
ADD COLUMN     "embeddingUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "searchableText" TEXT;

-- CreateTable
CREATE TABLE "SearchIndexQueue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" "SearchIndexAction" NOT NULL,
    "status" "SearchIndexStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SearchIndexQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchIndexQueue_status_enqueuedAt_idx" ON "SearchIndexQueue"("status", "enqueuedAt");

-- CreateIndex
CREATE INDEX "SearchIndexQueue_productId_idx" ON "SearchIndexQueue"("productId");
