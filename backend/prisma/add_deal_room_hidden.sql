-- Create deal_room_hidden_by_user table for user-hidden deal rooms
-- Run: cd backend && npx prisma db execute --file prisma/add_deal_room_hidden.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "deal_room_hidden_by_user" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_room_hidden_by_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deal_room_hidden_by_user_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_room_hidden_by_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "deal_room_hidden_by_user_dealRoomId_userId_key" ON "deal_room_hidden_by_user"("dealRoomId", "userId");
CREATE INDEX IF NOT EXISTS "deal_room_hidden_by_user_userId_idx" ON "deal_room_hidden_by_user"("userId");
CREATE INDEX IF NOT EXISTS "deal_room_hidden_by_user_dealRoomId_idx" ON "deal_room_hidden_by_user"("dealRoomId");
