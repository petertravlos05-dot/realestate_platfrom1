-- Χειροκίνητη εφαρμογή όταν δεν τρέχει migrate (ίδιο στυλ με add_payout_iban_manual.sql).
-- Τρέξε στο PostgreSQL ενάντια στη βάση σου.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registeredViaProfessionalJoin" BOOLEAN NOT NULL DEFAULT false;

-- Επαναφορά υπαρχόντων επαγγελματιών με προφίλ ώστε να εμφανίζονται στο Admin → Επαγγελματίες
UPDATE "users" u
SET "registeredViaProfessionalJoin" = true
FROM "professional_profiles" p
WHERE p."userId" = u.id
  AND u.role IN ('LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT')
  AND u."isDeleted" = false;
