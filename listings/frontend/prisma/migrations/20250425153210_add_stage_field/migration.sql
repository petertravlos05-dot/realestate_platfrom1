-- CreateEnum
CREATE TYPE "TransactionStage" AS ENUM ('PENDING', 'MEETING_SCHEDULED', 'DEPOSIT_PAID', 'FINAL_SIGNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPOINTMENT', 'PAYMENT', 'CONTRACT', 'COMPLETION', 'GENERAL', 'OFFER');

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_agentId_fkey";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "stage" TEXT DEFAULT 'PENDING',
ALTER COLUMN "agentId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "transaction_notifications" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isUnread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "transaction_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_notifications_transactionId_idx" ON "transaction_notifications"("transactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_notifications" ADD CONSTRAINT "transaction_notifications_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
