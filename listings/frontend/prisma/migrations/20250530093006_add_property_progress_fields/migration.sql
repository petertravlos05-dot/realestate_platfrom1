-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "propertyProgressId" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "assignmentDocument" JSONB,
ADD COLUMN     "assignmentType" TEXT DEFAULT 'platform',
ADD COLUMN     "lawyerInfo" JSONB,
ADD COLUMN     "uploadMethod" TEXT DEFAULT 'self';

-- CreateTable
CREATE TABLE "PropertyProgress" (
    "id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyProgress_propertyId_key" ON "PropertyProgress"("propertyId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_propertyProgressId_fkey" FOREIGN KEY ("propertyProgressId") REFERENCES "PropertyProgress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyProgress" ADD CONSTRAINT "PropertyProgress_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
