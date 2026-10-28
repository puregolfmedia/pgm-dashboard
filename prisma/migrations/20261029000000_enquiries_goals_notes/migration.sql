-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'LOST');

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('ENQUIRIES', 'BOOKINGS', 'REVENUE');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "intakeToken" TEXT;

-- AlterTable
ALTER TABLE "DataSourceConfig" ADD COLUMN     "bookingGoalLabel" TEXT,
ADD COLUMN     "membershipGoalLabel" TEXT;

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "category" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "eventDate" TEXT,
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "bookedValue" DOUBLE PRECISION,
    "bookedAt" TIMESTAMP(3),
    "staffNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "category" TEXT,
    "target" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enquiry_clientId_receivedAt_idx" ON "Enquiry"("clientId", "receivedAt");

-- CreateIndex
CREATE INDEX "Goal_clientId_idx" ON "Goal"("clientId");

-- CreateIndex
CREATE INDEX "Note_clientId_date_idx" ON "Note"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Client_intakeToken_key" ON "Client"("intakeToken");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
