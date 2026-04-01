-- Fix: Create deal_offers table if missing (migration was marked applied but table doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_offers" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "offeredBy" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deal_offers_dealRoomId_idx" ON "deal_offers"("dealRoomId");
CREATE INDEX IF NOT EXISTS "deal_offers_offeredBy_idx" ON "deal_offers"("offeredBy");

DO $$ BEGIN
    ALTER TABLE "deal_offers" ADD CONSTRAINT "deal_offers_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "deal_offers" ADD CONSTRAINT "deal_offers_offeredBy_fkey" FOREIGN KEY ("offeredBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
