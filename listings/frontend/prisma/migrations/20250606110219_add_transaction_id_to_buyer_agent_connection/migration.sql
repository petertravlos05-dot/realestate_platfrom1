/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `buyer_agent_connections` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectionId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "buyer_agent_connections" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "connectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "buyer_agent_connections_transactionId_key" ON "buyer_agent_connections"("transactionId");

-- CreateIndex
CREATE INDEX "buyer_agent_connections_transactionId_idx" ON "buyer_agent_connections"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_connectionId_key" ON "transactions"("connectionId");

-- CreateIndex
CREATE INDEX "transactions_connectionId_idx" ON "transactions"("connectionId");

-- AddForeignKey
ALTER TABLE "buyer_agent_connections" ADD CONSTRAINT "buyer_agent_connections_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
