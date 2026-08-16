CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'FLAGGED');

CREATE TYPE "EBMStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

CREATE TYPE "DebtCollectionActionType" AS ENUM ('CALL', 'VISIT', 'SMS', 'WHATSAPP', 'PROMISE_TO_PAY', 'PAYMENT_REMINDER', 'ACCOUNT_BLOCKED', 'NOTE');

CREATE TYPE "DebtCollectionStatus" AS ENUM ('OPEN', 'COMPLETED', 'MISSED', 'CANCELLED');

ALTER TABLE "Invoice"
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  ADD COLUMN "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "ebmStatus" "EBMStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "ebmReceiptNumber" TEXT,
  ADD COLUMN "ebmSdcId" TEXT,
  ADD COLUMN "ebmSignature" TEXT,
  ADD COLUMN "ebmSubmittedAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  ADD COLUMN "reconciliationStatus" "PaymentReconciliationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reconciliationNote" TEXT,
  ADD COLUMN "reconciledAt" TIMESTAMP(3),
  ADD COLUMN "reconciledById" TEXT;

CREATE TABLE "DeliveryProof" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "customerId" TEXT,
  "receiverName" TEXT NOT NULL,
  "receiverPhone" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "signatureDataUrl" TEXT,
  "photoUrl" TEXT,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtCollectionActivity" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "actionType" "DebtCollectionActionType" NOT NULL,
  "status" "DebtCollectionStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "promisedAmount" DECIMAL(14,2),
  "promisedDate" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DebtCollectionActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Invoice_ebmStatus_idx" ON "Invoice"("ebmStatus");
CREATE INDEX "Payment_reconciliationStatus_idx" ON "Payment"("reconciliationStatus");
CREATE INDEX "DeliveryProof_companyId_idx" ON "DeliveryProof"("companyId");
CREATE INDEX "DeliveryProof_tripId_idx" ON "DeliveryProof"("tripId");
CREATE INDEX "DeliveryProof_customerId_idx" ON "DeliveryProof"("customerId");
CREATE INDEX "DeliveryProof_createdAt_idx" ON "DeliveryProof"("createdAt");
CREATE INDEX "DebtCollectionActivity_companyId_idx" ON "DebtCollectionActivity"("companyId");
CREATE INDEX "DebtCollectionActivity_customerId_idx" ON "DebtCollectionActivity"("customerId");
CREATE INDEX "DebtCollectionActivity_invoiceId_idx" ON "DebtCollectionActivity"("invoiceId");
CREATE INDEX "DebtCollectionActivity_status_idx" ON "DebtCollectionActivity"("status");
CREATE INDEX "DebtCollectionActivity_nextFollowUpAt_idx" ON "DebtCollectionActivity"("nextFollowUpAt");
CREATE INDEX "DebtCollectionActivity_createdAt_idx" ON "DebtCollectionActivity"("createdAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_reconciledById_fkey"
  FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeliveryProof"
  ADD CONSTRAINT "DeliveryProof_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliveryProof"
  ADD CONSTRAINT "DeliveryProof_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "DeliveryTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliveryProof"
  ADD CONSTRAINT "DeliveryProof_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeliveryProof"
  ADD CONSTRAINT "DeliveryProof_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebtCollectionActivity"
  ADD CONSTRAINT "DebtCollectionActivity_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebtCollectionActivity"
  ADD CONSTRAINT "DebtCollectionActivity_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebtCollectionActivity"
  ADD CONSTRAINT "DebtCollectionActivity_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DebtCollectionActivity"
  ADD CONSTRAINT "DebtCollectionActivity_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
