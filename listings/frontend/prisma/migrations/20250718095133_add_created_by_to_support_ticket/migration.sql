/*
  Warnings:

  - Added the required column `createdBy` to the `support_tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "createdBy" TEXT;

-- Update existing records to set createdBy = userId
UPDATE "support_tickets" SET "createdBy" = "userId";

-- Make the column NOT NULL after updating
ALTER TABLE "support_tickets" ALTER COLUMN "createdBy" SET NOT NULL;

-- CreateIndex
CREATE INDEX "support_tickets_createdBy_idx" ON "support_tickets"("createdBy");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
