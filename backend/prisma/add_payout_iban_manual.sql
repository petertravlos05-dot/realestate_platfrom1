-- Χειροκίνητη εφαρμογή όταν το `prisma migrate dev` αποτυγχάνει λόγω drift / αποτυχημένων migrations.
-- Τρέξε στο PostgreSQL (psql, pgAdmin, κ.λπ.) ενάντια στη βάση σου.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "payoutIban" TEXT;
