/*
  Warnings:

  - You are about to drop the column `category` on the `transaction_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `isUnread` on the `transaction_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `transaction_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `transaction_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `transaction_progress` table. All the data in the column will be lost.
  - The `stage` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[transactionId]` on the table `property_leads` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leadId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `transaction_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transaction_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transaction_progress` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `stage` on the `transaction_progress` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStage" ADD VALUE 'INITIAL_CONTACT';
ALTER TYPE "TransactionStage" ADD VALUE 'PROPERTY_VIEWING';
ALTER TYPE "TransactionStage" ADD VALUE 'OFFER_NEGOTIATION';
ALTER TYPE "TransactionStage" ADD VALUE 'CONTRACT_PREPARATION';
ALTER TYPE "TransactionStage" ADD VALUE 'CONTRACT_SIGNING';
ALTER TYPE "TransactionStage" ADD VALUE 'PAYMENT_PROCESSING';
ALTER TYPE "TransactionStage" ADD VALUE 'PROPERTY_TRANSFER';

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_sellerId_fkey";

-- AlterTable
ALTER TABLE "property_leads" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "transaction_notifications" DROP COLUMN "category",
DROP COLUMN "isUnread",
DROP COLUMN "recipient",
DROP COLUMN "stage",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "transaction_progress" DROP COLUMN "comment",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "stage",
ADD COLUMN     "stage" "TransactionStage" NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "leadId" TEXT,
DROP COLUMN "stage",
ADD COLUMN     "stage" "TransactionStage",
ALTER COLUMN "sellerId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "property_leads_transactionId_key" ON "property_leads"("transactionId");

-- CreateIndex
CREATE INDEX "property_leads_transactionId_idx" ON "property_leads"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_leadId_key" ON "transactions"("leadId");

-- CreateIndex
CREATE INDEX "transactions_leadId_idx" ON "transactions"("leadId");

-- AddForeignKey
ALTER TABLE "property_leads" ADD CONSTRAINT "property_leads_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
