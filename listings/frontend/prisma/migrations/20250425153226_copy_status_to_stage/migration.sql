-- This is an empty migration.

-- Copy values from status to stage
UPDATE "transactions" SET stage = status WHERE stage IS NULL;

-- Make stage required and remove status
ALTER TABLE "transactions" ALTER COLUMN "stage" SET NOT NULL;
ALTER TABLE "transactions" DROP COLUMN "status";