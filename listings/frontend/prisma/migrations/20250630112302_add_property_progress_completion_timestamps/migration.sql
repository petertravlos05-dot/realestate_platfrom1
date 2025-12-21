-- AlterTable
ALTER TABLE "PropertyProgress" ADD COLUMN     "legalDocumentsCompletedAt" TIMESTAMP(3),
ADD COLUMN     "listingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "platformAssignmentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "platformReviewCompletedAt" TIMESTAMP(3);
