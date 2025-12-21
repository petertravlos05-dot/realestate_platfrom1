/*
  Warnings:

  - You are about to drop the column `stage` on the `PropertyProgress` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PropertyProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PropertyProgress" DROP COLUMN "stage",
DROP COLUMN "status",
ADD COLUMN     "legalDocumentsStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "listingStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "platformAssignmentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "platformReviewStatus" TEXT NOT NULL DEFAULT 'pending';
