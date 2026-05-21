-- CreateEnum
CREATE TYPE "TitleTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'OTHER');

-- CreateEnum
CREATE TYPE "IndustrySegment" AS ENUM ('PRIVATE_MEMBERS_CLUB', 'RESORT_GOLF', 'MUNICIPAL_PUBLIC', 'GOLF_ACADEMY', 'GOLF_RETAIL', 'GOLF_MEDIA', 'SUPPLIER_VENDOR', 'ASSOCIATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('NOT_STARTED', 'MESSAGED', 'REPLIED', 'MEETING_BOOKED', 'NOT_INTERESTED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "OutreachType" AS ENUM ('LINKEDIN_MESSAGE', 'EMAIL', 'CALL', 'MEETING');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "company" TEXT,
    "position" TEXT,
    "connectedOn" TIMESTAMP(3),
    "titleTier" "TitleTier" NOT NULL DEFAULT 'OTHER',
    "industrySegment" "IndustrySegment" NOT NULL DEFAULT 'UNKNOWN',
    "outreachStatus" "OutreachStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactNote" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachLog" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "OutreachType" NOT NULL,
    "notes" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactNote" ADD CONSTRAINT "ContactNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
