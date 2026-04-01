-- CreateEnum (ProfessionalType may not exist if 20260207100000 failed or was skipped)
DO $$ BEGIN
  CREATE TYPE "ProfessionalType" AS ENUM ('LAWYER', 'NOTARY', 'ENGINEER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "professional_invites" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_invites_dealRoomId_idx" ON "professional_invites"("dealRoomId");

-- CreateIndex
CREATE INDEX "professional_invites_email_idx" ON "professional_invites"("email");

-- CreateIndex
CREATE INDEX "professional_invites_requestedById_idx" ON "professional_invites"("requestedById");

-- AddForeignKey
ALTER TABLE "professional_invites" ADD CONSTRAINT "professional_invites_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_invites" ADD CONSTRAINT "professional_invites_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
