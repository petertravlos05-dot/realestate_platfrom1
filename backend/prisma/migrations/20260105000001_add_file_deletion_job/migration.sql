-- CreateEnum
CREATE TYPE "FileDeletionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DELETED', 'FAILED');

-- CreateTable
CREATE TABLE "file_deletion_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "status" "FileDeletionStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_deletion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_deletion_jobs_userId_s3Key_key" ON "file_deletion_jobs"("userId", "s3Key");

-- CreateIndex
CREATE INDEX "file_deletion_jobs_userId_idx" ON "file_deletion_jobs"("userId");

-- CreateIndex
CREATE INDEX "file_deletion_jobs_status_idx" ON "file_deletion_jobs"("status");

-- CreateIndex
CREATE INDEX "file_deletion_jobs_status_createdAt_idx" ON "file_deletion_jobs"("status", "createdAt");




