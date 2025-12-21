-- Add price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'price'
    ) THEN
        -- First add as nullable with default
        ALTER TABLE "properties" ADD COLUMN "price" DOUBLE PRECISION DEFAULT 0;
        
        -- Update existing rows to have a default price
        UPDATE "properties" SET "price" = 0 WHERE "price" IS NULL;
        
        -- Make it NOT NULL
        ALTER TABLE "properties" ALTER COLUMN "price" SET NOT NULL;
        ALTER TABLE "properties" ALTER COLUMN "price" DROP DEFAULT;
    END IF;
END $$;

