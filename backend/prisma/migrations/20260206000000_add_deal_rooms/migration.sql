-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED', 'COMPLETED', 'CLOSED_PROPERTY_SOLD');

-- CreateEnum (ENGINEER added in 20260207100000)
CREATE TYPE "DealRole" AS ENUM ('BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ADMIN');

-- CreateTable
CREATE TABLE "deal_rooms" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "agentId" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "buyerSigningConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sellerSigningConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notarySigningConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "engineerApprovedSellerDocumentsAt" TIMESTAMP(3),
    "lawyerApprovedSellerDocumentsAt" TIMESTAMP(3),
    "notaryApprovedDocumentsAt" TIMESTAMP(3),
    "buyerSkippedViewingAt" TIMESTAMP(3),
    "buyerConfirmedInterestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_participants" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "DealRole" NOT NULL,
    "permissions" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "deal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_room_hidden_by_user" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_room_hidden_by_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_rooms_propertyId_buyerId_key" ON "deal_rooms"("propertyId", "buyerId");
CREATE INDEX "deal_rooms_buyerId_idx" ON "deal_rooms"("buyerId");
CREATE INDEX "deal_rooms_propertyId_idx" ON "deal_rooms"("propertyId");
CREATE INDEX "deal_rooms_status_idx" ON "deal_rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deal_participants_dealRoomId_userId_key" ON "deal_participants"("dealRoomId", "userId");
CREATE INDEX "deal_participants_userId_idx" ON "deal_participants"("userId");
CREATE INDEX "deal_participants_dealRoomId_idx" ON "deal_participants"("dealRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_room_hidden_by_user_dealRoomId_userId_key" ON "deal_room_hidden_by_user"("dealRoomId", "userId");
CREATE INDEX "deal_room_hidden_by_user_userId_idx" ON "deal_room_hidden_by_user"("userId");
CREATE INDEX "deal_room_hidden_by_user_dealRoomId_idx" ON "deal_room_hidden_by_user"("dealRoomId");

-- AddForeignKey
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_room_hidden_by_user" ADD CONSTRAINT "deal_room_hidden_by_user_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_room_hidden_by_user" ADD CONSTRAINT "deal_room_hidden_by_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
