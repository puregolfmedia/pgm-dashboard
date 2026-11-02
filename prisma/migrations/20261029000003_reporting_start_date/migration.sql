-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "reportingStartDate" TIMESTAMP(3);

-- Hennerton: reporting starts 1 October 2026
UPDATE "Client" SET "reportingStartDate" = '2026-10-01 00:00:00' WHERE "name" ILIKE 'Hennerton%' AND "reportingStartDate" IS NULL;
