-- CreateEnum for DocumentStatus (if not exists)
DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable deal_documents
CREATE TABLE IF NOT EXISTS "deal_documents" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "requestedFromRole" "DealRole",
    "uploadedById" TEXT,
    "reviewById" TEXT,
    "reviewNote" TEXT,
    "guideWhere" TEXT,
    "guideInstructions" TEXT,
    "s3Key" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "visibility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_documents_pkey" PRIMARY KEY ("id")
);

-- Add users.country if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='country') THEN
    ALTER TABLE "users" ADD COLUMN "country" TEXT;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deal_documents_dealRoomId_idx" ON "deal_documents"("dealRoomId");
CREATE INDEX IF NOT EXISTS "deal_documents_status_idx" ON "deal_documents"("status");
CREATE INDEX IF NOT EXISTS "deal_documents_category_idx" ON "deal_documents"("category");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_documents_dealRoomId_fkey'
  ) THEN
    ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_documents_requestedById_fkey'
  ) THEN
    ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_documents_uploadedById_fkey'
  ) THEN
    ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_documents_reviewById_fkey'
  ) THEN
    ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_reviewById_fkey" FOREIGN KEY ("reviewById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
