-- CreateEnum
CREATE TYPE "ProductContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "compatibleModels" TEXT[];

-- CreateTable
CREATE TABLE "ProductContent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "longDescriptionMd" TEXT,
    "shortDescription" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "ProductContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductContent_productId_idx" ON "ProductContent"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductContent_productId_locale_key" ON "ProductContent"("productId", "locale");

-- AddForeignKey
ALTER TABLE "ProductContent" ADD CONSTRAINT "ProductContent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
