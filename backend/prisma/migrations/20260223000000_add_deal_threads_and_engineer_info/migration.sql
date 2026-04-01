-- Add engineerInfo to properties (from 20260207100000 scope)
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "engineerInfo" JSONB;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ThreadType" AS ENUM ('GROUP', 'DIRECT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "deal_threads" (
    "id" TEXT NOT NULL,
    "dealRoomId" TEXT NOT NULL,
    "type" "ThreadType" NOT NULL DEFAULT 'GROUP',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "deal_thread_members" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_thread_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "deal_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deal_threads_dealRoomId_idx" ON "deal_threads"("dealRoomId");
CREATE INDEX IF NOT EXISTS "deal_threads_type_idx" ON "deal_threads"("type");

CREATE UNIQUE INDEX IF NOT EXISTS "deal_thread_members_threadId_userId_key" ON "deal_thread_members"("threadId", "userId");
CREATE INDEX IF NOT EXISTS "deal_thread_members_userId_idx" ON "deal_thread_members"("userId");
CREATE INDEX IF NOT EXISTS "deal_thread_members_threadId_idx" ON "deal_thread_members"("threadId");

CREATE INDEX IF NOT EXISTS "deal_messages_threadId_createdAt_idx" ON "deal_messages"("threadId", "createdAt");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  ALTER TABLE "deal_threads" ADD CONSTRAINT "deal_threads_dealRoomId_fkey" FOREIGN KEY ("dealRoomId") REFERENCES "deal_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "deal_thread_members" ADD CONSTRAINT "deal_thread_members_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "deal_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "deal_thread_members" ADD CONSTRAINT "deal_thread_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "deal_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
