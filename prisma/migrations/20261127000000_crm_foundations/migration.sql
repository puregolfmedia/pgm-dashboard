-- AlterEnum
ALTER TYPE "EnquiryStatus" ADD VALUE IF NOT EXISTS 'TOUR_BOOKED' BEFORE 'BOOKED';

-- CreateEnum
CREATE TYPE "EnquiryType" AS ENUM ('MEMBERSHIP', 'WEDDING', 'SOCIETY', 'DRIVING_RANGE', 'FUNCTION', 'GENERAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;

-- CreateTable (named ClubContact: an older, unused "Contact" table may already exist)
CREATE TABLE "ClubContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nameEnc" TEXT,
    "emailEnc" TEXT,
    "phoneEnc" TEXT,
    "emailHash" TEXT,
    "phoneHash" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentWording" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubContact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClubContact_clientId_emailHash_key" ON "ClubContact"("clientId", "emailHash");
CREATE INDEX "ClubContact_clientId_phoneHash_idx" ON "ClubContact"("clientId", "phoneHash");
CREATE INDEX "ClubContact_lastActivityAt_idx" ON "ClubContact"("lastActivityAt");
ALTER TABLE "ClubContact" ADD CONSTRAINT "ClubContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Enquiry
ALTER TABLE "Enquiry" ADD COLUMN "contactId" TEXT,
ADD COLUMN "type" "EnquiryType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "sourceDetail" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "messageEnc" TEXT,
ADD COLUMN "staffNotesEnc" TEXT,
ADD COLUMN "stageChangedAt" TIMESTAMP(3),
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "anonymisedAt" TIMESTAMP(3);
CREATE INDEX "Enquiry_clientId_status_idx" ON "Enquiry"("clientId", "status");
CREATE INDEX "Enquiry_contactId_idx" ON "Enquiry"("contactId");
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ClubContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Old source names
UPDATE "Enquiry" SET "source" = 'website_form' WHERE "source" = 'form';

-- CreateTable
CREATE TABLE "EnquiryEvent" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "kind" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "detail" TEXT,
    CONSTRAINT "EnquiryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnquiryEvent_enquiryId_at_idx" ON "EnquiryEvent"("enquiryId", "at");
CREATE INDEX "EnquiryEvent_clientId_at_idx" ON "EnquiryEvent"("clientId", "at");
ALTER TABLE "EnquiryEvent" ADD CONSTRAINT "EnquiryEvent_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "OutboundJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "enquiryId" TEXT,
    "channel" TEXT NOT NULL,
    "recipientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "OutboundJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutboundJob_status_nextAttemptAt_idx" ON "OutboundJob"("status", "nextAttemptAt");
CREATE INDEX "OutboundJob_enquiryId_idx" ON "OutboundJob"("enquiryId");
ALTER TABLE "OutboundJob" ADD CONSTRAINT "OutboundJob_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CrmSettings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mailchimpSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mailchimpAudienceId" TEXT,
    "mailchimpTags" JSONB,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertIncludesPhone" BOOLEAN NOT NULL DEFAULT false,
    "retentionMonths" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CrmSettings_clientId_key" ON "CrmSettings"("clientId");
ALTER TABLE "CrmSettings" ADD CONSTRAINT "CrmSettings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AlertRecipient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneEnc" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "types" "EnquiryType"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "consentConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertRecipient_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlertRecipient_clientId_idx" ON "AlertRecipient"("clientId");
ALTER TABLE "AlertRecipient" ADD CONSTRAINT "AlertRecipient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "firstFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);
