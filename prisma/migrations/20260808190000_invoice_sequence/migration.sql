CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

INSERT INTO "InvoiceSequence" ("id", "lastNumber")
SELECT
    'global',
    COALESCE(MAX(CAST(SUBSTRING("invoiceNumber" FROM 5) AS INTEGER)), 0)
FROM "Invoice"
WHERE "invoiceNumber" ~ '^INV-[0-9]+$'
ON CONFLICT ("id") DO NOTHING;
