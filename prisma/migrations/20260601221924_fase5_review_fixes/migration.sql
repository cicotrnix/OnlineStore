-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';

-- AlterEnum
ALTER TYPE "SensitiveActionStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unitCostCents" BIGINT;

-- AlterTable
ALTER TABLE "SensitiveActionToken" ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subjectId" TEXT,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_subjectId_idx" ON "AuditLog"("subjectId");
