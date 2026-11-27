-- Hosted enquiry forms: which forms each club offers, and its privacy policy link.
-- Adds two columns only; nothing existing is changed or removed.
ALTER TABLE "CrmSettings" ADD COLUMN "formTypes" "EnquiryType"[] NOT NULL DEFAULT ARRAY['MEMBERSHIP', 'WEDDING', 'SOCIETY', 'DRIVING_RANGE', 'FUNCTION', 'GENERAL']::"EnquiryType"[];
ALTER TABLE "CrmSettings" ADD COLUMN "privacyPolicyUrl" TEXT;
