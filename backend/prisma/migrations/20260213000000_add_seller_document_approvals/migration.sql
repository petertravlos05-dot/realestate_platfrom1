-- AlterTable (idempotent - skip if columns already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deal_rooms' AND column_name='engineerApprovedSellerDocumentsAt') THEN
    ALTER TABLE "deal_rooms" ADD COLUMN "engineerApprovedSellerDocumentsAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deal_rooms' AND column_name='lawyerApprovedSellerDocumentsAt') THEN
    ALTER TABLE "deal_rooms" ADD COLUMN "lawyerApprovedSellerDocumentsAt" TIMESTAMP(3);
  END IF;
END $$;
