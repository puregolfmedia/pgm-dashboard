-- AlterTable
ALTER TABLE "DataSourceConfig" ADD COLUMN     "emailOctopusApiKey" TEXT,
ADD COLUMN     "emailOctopusListId" TEXT,
ADD COLUMN     "ga4MembershipEventName" TEXT DEFAULT 'membership_enquiry';
