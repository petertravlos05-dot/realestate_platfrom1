-- CreateEnum VerificationStatus
DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum AppointmentStatus
DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum RequestStatus
DO $$ BEGIN
  CREATE TYPE "RequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable professional_profiles
CREATE TABLE IF NOT EXISTS "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProfessionalType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "officeName" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "areaTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT,
    "bio" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" JSONB,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "professional_profiles_userId_key" ON "professional_profiles"("userId");
CREATE INDEX IF NOT EXISTS "professional_profiles_type_idx" ON "professional_profiles"("type");
CREATE INDEX IF NOT EXISTS "professional_profiles_verificationStatus_idx" ON "professional_profiles"("verificationStatus");
CREATE INDEX IF NOT EXISTS "professional_profiles_city_idx" ON "professional_profiles"("city");

-- CreateTable professional_availability
CREATE TABLE IF NOT EXISTS "professional_availability" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Athens',
    "weeklyRules" JSONB NOT NULL,
    "exceptions" JSONB,
    "meetingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_availability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "professional_availability_professionalId_key" ON "professional_availability"("professionalId");

-- CreateTable professional_requests
CREATE TABLE IF NOT EXISTS "professional_requests" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "ProfessionalType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "professional_requests_dealRoomId_professionalId_key" ON "professional_requests"("dealRoomId", "professionalId");
CREATE INDEX IF NOT EXISTS "professional_requests_dealRoomId_idx" ON "professional_requests"("dealRoomId");
CREATE INDEX IF NOT EXISTS "professional_requests_professionalId_idx" ON "professional_requests"("professionalId");
CREATE INDEX IF NOT EXISTS "professional_requests_requestedById_idx" ON "professional_requests"("requestedById");

-- CreateTable deal_appointments
CREATE TABLE IF NOT EXISTS "deal_appointments" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "sellerApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_appointments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deal_appointments_dealRoomId_idx" ON "deal_appointments"("dealRoomId");
CREATE INDEX IF NOT EXISTS "deal_appointments_professionalId_startAt_idx" ON "deal_appointments"("professionalId", "startAt");
CREATE INDEX IF NOT EXISTS "deal_appointments_bookedById_idx" ON "deal_appointments"("bookedById");

-- AddForeignKey professional_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_profiles_userId_fkey') THEN
    ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey professional_availability
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_availability_professionalId_fkey') THEN
    ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey professional_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_requests_dealRoomId_fkey') THEN
    ALTER TABLE "professional_requests" ADD CONSTRAINT "professional_requests_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_requests_professionalId_fkey') THEN
    ALTER TABLE "professional_requests" ADD CONSTRAINT "professional_requests_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_requests_requestedById_fkey') THEN
    ALTER TABLE "professional_requests" ADD CONSTRAINT "professional_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey deal_appointments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_appointments_dealRoomId_fkey') THEN
    ALTER TABLE "deal_appointments" ADD CONSTRAINT "deal_appointments_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_appointments_professionalId_fkey') THEN
    ALTER TABLE "deal_appointments" ADD CONSTRAINT "deal_appointments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_appointments_bookedById_fkey') THEN
    ALTER TABLE "deal_appointments" ADD CONSTRAINT "deal_appointments_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
