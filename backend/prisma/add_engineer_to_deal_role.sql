-- Add ENGINEER to DealRole enum (required when accepting engineer requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ENGINEER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DealRole')
  ) THEN
    ALTER TYPE "DealRole" ADD VALUE 'ENGINEER';
  END IF;
END $$;
