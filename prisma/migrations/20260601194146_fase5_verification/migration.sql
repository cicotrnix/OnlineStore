-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxDocumentType" AS ENUM ('US_RESALE_CERT', 'FOREIGN_EQUIV');

-- CreateEnum
CREATE TYPE "TaxDocumentStatus" AS ENUM ('UPLOADED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "country" TEXT,
ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaxDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "TaxDocumentType" NOT NULL,
    "number" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "status" "TaxDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "TaxDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxDocument_organizationId_idx" ON "TaxDocument"("organizationId");

-- AddForeignKey
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
