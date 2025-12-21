/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `property_leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "buyer_agent_connections" ADD COLUMN     "interestCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "property_leads" DROP COLUMN "isDeleted",
ADD COLUMN     "interestCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "interestCancelled" BOOLEAN NOT NULL DEFAULT false;
