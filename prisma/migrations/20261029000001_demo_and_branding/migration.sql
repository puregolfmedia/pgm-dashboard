-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT;
