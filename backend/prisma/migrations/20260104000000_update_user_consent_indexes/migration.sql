-- Drop existing indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_consents') THEN
    DROP INDEX IF EXISTS "user_consents_userId_idx";
    DROP INDEX IF EXISTS "user_consents_consentType_idx";
    DROP INDEX IF EXISTS "user_consents_acceptedAt_idx";

    -- Create new composite indexes as per requirements
    CREATE INDEX IF NOT EXISTS "user_consents_userId_consentType_idx" ON "user_consents"("userId", "consentType");
    CREATE INDEX IF NOT EXISTS "user_consents_consentType_version_idx" ON "user_consents"("consentType", "version");
  END IF;
END $$;




