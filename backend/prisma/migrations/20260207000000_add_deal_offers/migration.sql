-- CreateTable
CREATE TABLE "deal_offers" (
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

-- CreateIndex
CREATE INDEX "deal_offers_dealRoomId_idx" ON "deal_offers"("dealRoomId");

-- CreateIndex
CREATE INDEX "deal_offers_offeredBy_idx" ON "deal_offers"("offeredBy");

-- AddForeignKey
ALTER TABLE "deal_offers" ADD CONSTRAINT "deal_offers_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_offers" ADD CONSTRAINT "deal_offers_offeredBy_fkey" FOREIGN KEY ("offeredBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
