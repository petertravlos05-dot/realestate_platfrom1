-- 1. Προσθέτουμε το userId ως nullable
ALTER TABLE "referral_points" ADD COLUMN     "userId" TEXT;

-- 2. Ενημερώνουμε το userId για κάθε referral_point
-- Αν reason = 'registration' και points = 50, userId = referredId
UPDATE "referral_points" rp
SET "userId" = r."referredId"
FROM "referrals" r
WHERE rp."referralId" = r."id" AND rp."reason" = 'registration' AND rp."points" = 50;

-- Αν reason = 'registration' και points = 100, userId = referrerId
UPDATE "referral_points" rp
SET "userId" = r."referrerId"
FROM "referrals" r
WHERE rp."referralId" = r."id" AND rp."reason" = 'registration' AND rp."points" = 100;

-- Για όλα τα υπόλοιπα, userId = referrerId
UPDATE "referral_points" rp
SET "userId" = r."referrerId"
FROM "referrals" r
WHERE rp."referralId" = r."id" AND rp."userId" IS NULL;

-- 3. Τώρα το κάνουμε NOT NULL
ALTER TABLE "referral_points" ALTER COLUMN "userId" SET NOT NULL;

-- 4. Δημιουργούμε index και foreign key
CREATE INDEX "referral_points_userId_idx" ON "referral_points"("userId");
ALTER TABLE "referral_points" ADD CONSTRAINT "referral_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
