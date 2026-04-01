-- Create professional_invites table (run manually if migration fails)
-- Execute: psql -U postgres -d realestate_db -f prisma/create-professional-invites.sql
-- Or: npx prisma db execute --file prisma/create-professional-invites.sql

CREATE TABLE IF NOT EXISTS "professional_invites" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "type" "ProfessionalType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "registrationNumber" TEXT,
    "sendOtpTo" TEXT NOT NULL,
    "otpCode" TEXT,
    "otpExpires" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "linkedProfessionalId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_invites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "professional_invites_dealRoomId_idx" ON "professional_invites"("dealRoomId");
CREATE INDEX IF NOT EXISTS "professional_invites_email_idx" ON "professional_invites"("email");
CREATE INDEX IF NOT EXISTS "professional_invites_requestedById_idx" ON "professional_invites"("requestedById");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_invites_dealRoomId_fkey') THEN
    ALTER TABLE "professional_invites" ADD CONSTRAINT "professional_invites_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_invites_requestedById_fkey') THEN
    ALTER TABLE "professional_invites" ADD CONSTRAINT "professional_invites_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
