-- DropIndex
DROP INDEX "product_embedding_hnsw_idx";

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "periodYm" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_periodYm_key" ON "AiUsage"("periodYm");
