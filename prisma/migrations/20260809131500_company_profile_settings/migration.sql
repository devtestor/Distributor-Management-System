ALTER TABLE "Company"
ADD COLUMN "industry" TEXT NOT NULL DEFAULT 'Beverage distribution',
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#0b6b50',
ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#f4c542',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RWF',
ADD COLUMN "defaultLocale" "Locale" NOT NULL DEFAULT 'en',
ADD COLUMN "featureFlags" JSONB;

