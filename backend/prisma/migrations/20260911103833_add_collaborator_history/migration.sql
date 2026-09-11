-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HistoryType" ADD VALUE 'COLLABORATOR_ADDED';
ALTER TYPE "HistoryType" ADD VALUE 'COLLABORATOR_REMOVED';

-- AlterTable
ALTER TABLE "DealHistory" ADD COLUMN     "collaboratorId" UUID;

-- AddForeignKey
ALTER TABLE "DealHistory" ADD CONSTRAINT "DealHistory_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
