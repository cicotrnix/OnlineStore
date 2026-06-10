-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hashedPassword" TEXT,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3);
