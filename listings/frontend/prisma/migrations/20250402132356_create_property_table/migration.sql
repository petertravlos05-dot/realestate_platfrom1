/*
  Warnings:

  - You are about to drop the column `data` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `energyClass` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `energyConsumption` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `heating` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `yearBuilt` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `commission` on the `transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[buyerId,agentId,propertyId]` on the table `buyer_agent_connections` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Made the column `agentId` on table `transactions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_agentId_fkey";

-- DropIndex
DROP INDEX "buyer_agent_connections_agentId_idx";

-- DropIndex
DROP INDEX "buyer_agent_connections_buyerId_idx";

-- DropIndex
DROP INDEX "buyer_agent_connections_propertyId_buyerId_key";

-- DropIndex
DROP INDEX "buyer_agent_connections_propertyId_idx";

-- DropIndex
DROP INDEX "property_stats_propertyId_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "data",
DROP COLUMN "read",
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "password";

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "energyClass",
DROP COLUMN "energyConsumption",
DROP COLUMN "heating",
DROP COLUMN "lat",
DROP COLUMN "lng",
DROP COLUMN "yearBuilt",
ALTER COLUMN "type" SET DEFAULT 'HOUSE',
ALTER COLUMN "status" SET DEFAULT 'AVAILABLE',
ALTER COLUMN "bedrooms" DROP NOT NULL,
ALTER COLUMN "bathrooms" DROP NOT NULL,
ALTER COLUMN "area" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "commission",
ALTER COLUMN "agentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'BUYER';

-- CreateIndex
CREATE UNIQUE INDEX "buyer_agent_connections_buyerId_agentId_propertyId_key" ON "buyer_agent_connections"("buyerId", "agentId", "propertyId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
