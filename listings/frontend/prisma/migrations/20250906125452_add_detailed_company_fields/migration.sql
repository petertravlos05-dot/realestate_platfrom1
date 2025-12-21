/*
  Warnings:

  - You are about to drop the column `companyAddress` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "companyAddress",
ADD COLUMN     "companyDou" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "companyHeadquarters" TEXT,
ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "companyTitle" TEXT,
ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "companyWorkingHours" TEXT,
ADD COLUMN     "contactPersonEmail" TEXT,
ADD COLUMN     "contactPersonName" TEXT,
ADD COLUMN     "contactPersonPhone" TEXT;
