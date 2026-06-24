-- AlterEnum
ALTER TYPE "TaxDocumentType" ADD VALUE 'BUSINESS_REGISTRY_PROOF';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "taxIdCountry" TEXT;
