-- CreateTable (ConsentType enum already exists)
CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (ignore if exists)
CREATE INDEX IF NOT EXISTS "user_consents_userId_idx" ON "user_consents"("userId");
CREATE INDEX IF NOT EXISTS "user_consents_consentType_idx" ON "user_consents"("consentType");
CREATE INDEX IF NOT EXISTS "user_consents_acceptedAt_idx" ON "user_consents"("acceptedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "user_consents_userId_consentType_version_key" ON "user_consents"("userId", "consentType", "version");

-- AddForeignKey (only if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_consents_userId_fkey'
  ) THEN
    ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
