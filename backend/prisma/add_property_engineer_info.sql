-- Idempotent: fixes P2022 when Prisma schema has engineerInfo but DB does not.
-- Run: npx prisma db execute --file prisma/add_property_engineer_info.sql
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "engineerInfo" JSONB;
