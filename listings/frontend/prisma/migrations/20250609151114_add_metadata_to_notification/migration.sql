/*
  Warnings:

  - You are about to drop the column `transactionId` on the `buyer_agent_connections` table. All the data in the column will be lost.
  - You are about to drop the column `connectionId` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "buyer_agent_connections" DROP CONSTRAINT "buyer_agent_connections_transactionId_fkey";

-- DropIndex
DROP INDEX "buyer_agent_connections_transactionId_idx";

-- DropIndex
DROP INDEX "buyer_agent_connections_transactionId_key";

-- DropIndex
DROP INDEX "transactions_connectionId_idx";

-- DropIndex
DROP INDEX "transactions_connectionId_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "buyer_agent_connections" DROP COLUMN "transactionId";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "connectionId";
