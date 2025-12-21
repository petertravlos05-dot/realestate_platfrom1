/*
  Warnings:

  - Added the required column `sellerId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "sellerId" TEXT;

-- Update existing records
UPDATE "transactions" t
SET "sellerId" = (
  SELECT p."userId" 
  FROM "properties" p 
  WHERE p.id = t."propertyId"
);

-- Make the column NOT NULL
ALTER TABLE "transactions" ALTER COLUMN "sellerId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "transactions_sellerId_idx" ON "transactions"("sellerId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
