-- Add CLOSED_PROPERTY_SOLD to DealStatus enum
-- Run manually if prisma migrate dev fails:
--   cd backend && npx prisma db execute --file prisma/add_closed_property_sold.sql
-- Or: psql -U postgres -d realestate_db -f add_closed_property_sold.sql

ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'CLOSED_PROPERTY_SOLD';
