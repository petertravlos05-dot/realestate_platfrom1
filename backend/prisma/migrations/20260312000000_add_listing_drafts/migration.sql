-- CreateTable
CREATE TABLE "property_listing_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "activeTab" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_listing_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_listing_drafts_userId_idx" ON "property_listing_drafts"("userId");

-- AddForeignKey
ALTER TABLE "property_listing_drafts" ADD CONSTRAINT "property_listing_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
