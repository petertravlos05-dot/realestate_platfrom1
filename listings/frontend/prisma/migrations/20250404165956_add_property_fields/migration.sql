-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "amenities" TEXT[],
ADD COLUMN     "energyClass" TEXT,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "heating" TEXT,
ADD COLUMN     "yearBuilt" INTEGER;
