-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('DEAL_OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Safely migrate or create DealAlert
DO $$ 
BEGIN
    -- Check if legacy DealAlert table exists without notificationId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DealAlert' AND column_name = 'dealId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DealAlert' AND column_name = 'notificationId'
    ) THEN
        -- Add id column
        ALTER TABLE "DealAlert" ADD COLUMN "id" UUID DEFAULT gen_random_uuid();
        -- Add notificationId column
        ALTER TABLE "DealAlert" ADD COLUMN "notificationId" UUID;
        -- Add timestamps if missing
        ALTER TABLE "DealAlert" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE "DealAlert" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

        -- Create parent Notification records for existing DealAlert rows
        INSERT INTO "Notification" ("id", "userId", "type", "createdAt", "updatedAt")
        SELECT 
            da."id" AS "id",
            d."ownerId" AS "userId",
            'DEAL_OVERDUE'::"NotificationType" AS "type",
            COALESCE(da."dismissedAt", CURRENT_TIMESTAMP) AS "createdAt",
            COALESCE(da."dismissedAt", CURRENT_TIMESTAMP) AS "updatedAt"
        FROM "DealAlert" da
        JOIN "Deal" d ON d."id" = da."dealId"
        ON CONFLICT ("id") DO NOTHING;

        -- Link notificationId to the created notification id
        UPDATE "DealAlert" SET "notificationId" = "id" WHERE "notificationId" IS NULL;

        -- Alter columns to NOT NULL and adjust constraints
        ALTER TABLE "DealAlert" ALTER COLUMN "id" SET NOT NULL;
        ALTER TABLE "DealAlert" ALTER COLUMN "notificationId" SET NOT NULL;
        ALTER TABLE "DealAlert" ALTER COLUMN "createdAt" SET NOT NULL;
        ALTER TABLE "DealAlert" ALTER COLUMN "updatedAt" SET NOT NULL;

        -- Recreate primary key on id
        ALTER TABLE "DealAlert" DROP CONSTRAINT IF EXISTS "DealAlert_pkey";
        ALTER TABLE "DealAlert" ADD CONSTRAINT "DealAlert_pkey" PRIMARY KEY ("id");

    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'DealAlert'
    ) THEN
        -- Create table fresh if it did not exist
        CREATE TABLE "DealAlert" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "notificationId" UUID NOT NULL,
            "dealId" UUID NOT NULL,
            "dismissedCloseDate" DATE,
            "dismissedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "DealAlert_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- DealAlert unique constraints (unique constraints provide required index lookups automatically)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DealAlert_notificationId_key') THEN
        ALTER TABLE "DealAlert" ADD CONSTRAINT "DealAlert_notificationId_key" UNIQUE ("notificationId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DealAlert_dealId_key') THEN
        ALTER TABLE "DealAlert" ADD CONSTRAINT "DealAlert_dealId_key" UNIQUE ("dealId");
    END IF;
END $$;

-- Add Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DealAlert_notificationId_fkey') THEN
        ALTER TABLE "DealAlert" ADD CONSTRAINT "DealAlert_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DealAlert_dealId_fkey') THEN
        ALTER TABLE "DealAlert" ADD CONSTRAINT "DealAlert_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
