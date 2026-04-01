-- CreateEnum (ProfessionalType may not exist if base migration predates deal room models)
DO $$ BEGIN
  CREATE TYPE "ProfessionalType" AS ENUM ('LAWYER', 'NOTARY', 'ENGINEER');
EXCEPTION
  WHEN duplicate_object THEN
    -- Type exists; add ENGINEER if missing
    BEGIN
      ALTER TYPE "ProfessionalType" ADD VALUE 'ENGINEER';
    EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
    END;
-- AlterEnum
ALTER TYPE "DealRole" ADD VALUE 'ENGINEER';

END $$;

-- AlterEnum (DealRole may not exist; skip if so)
DO $$ BEGIN
  ALTER TYPE "DealRole" ADD VALUE 'ENGINEER';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
