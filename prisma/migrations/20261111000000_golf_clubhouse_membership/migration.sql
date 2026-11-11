-- AlterTable
ALTER TABLE "Client" ADD COLUMN "membershipBaseline" DOUBLE PRECISION,
ADD COLUMN "membershipTarget" DOUBLE PRECISION,
ADD COLUMN "membershipTargetDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DataSourceConfig" ADD COLUMN "golfPageWords" TEXT,
ADD COLUMN "clubhousePageWords" TEXT,
ADD COLUMN "ga4GolfEventNames" TEXT;

-- CreateTable
CREATE TABLE "MembershipValue" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "members" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipValue_clientId_date_idx" ON "MembershipValue"("clientId", "date");

-- AddForeignKey
ALTER TABLE "MembershipValue" ADD CONSTRAINT "MembershipValue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
