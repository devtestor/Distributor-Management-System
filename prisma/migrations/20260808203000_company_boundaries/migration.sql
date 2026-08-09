CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

INSERT INTO "Company" ("id", "name", "code")
VALUES ('00000000-0000-0000-0000-000000000010', 'BRALIRWA Distributor', 'BRALIRWA-DEMO')
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Product" ADD COLUMN "companyId" TEXT;
ALTER TABLE "ProductPriceHistory" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT;
ALTER TABLE "InvoiceSequence" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EmptyContainerMovement" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "companyId" TEXT;
ALTER TABLE "DeliveryTrip" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "companyId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "companyId" TEXT;

UPDATE "User" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Product" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "ProductPriceHistory" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Warehouse" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Customer" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "StockMovement" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Invoice" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "InvoiceSequence" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Payment" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "EmptyContainerMovement" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Vehicle" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "DeliveryTrip" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "Expense" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;
UPDATE "AuditLog" SET "companyId" = '00000000-0000-0000-0000-000000000010' WHERE "companyId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ProductPriceHistory" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Warehouse" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoiceSequence" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EmptyContainerMovement" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "DeliveryTrip" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "companyId" SET NOT NULL;

CREATE UNIQUE INDEX "InvoiceSequence_companyId_key" ON "InvoiceSequence"("companyId");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE INDEX "ProductPriceHistory_companyId_idx" ON "ProductPriceHistory"("companyId");
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX "StockMovement_companyId_idx" ON "StockMovement"("companyId");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");
CREATE INDEX "EmptyContainerMovement_companyId_idx" ON "EmptyContainerMovement"("companyId");
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");
CREATE INDEX "DeliveryTrip_companyId_idx" ON "DeliveryTrip"("companyId");
CREATE INDEX "Expense_companyId_idx" ON "Expense"("companyId");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmptyContainerMovement" ADD CONSTRAINT "EmptyContainerMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryTrip" ADD CONSTRAINT "DeliveryTrip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
