DROP INDEX IF EXISTS "Product_sku_key";
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";
DROP INDEX IF EXISTS "Vehicle_plateNumber_key";

CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");
CREATE UNIQUE INDEX "Vehicle_companyId_plateNumber_key" ON "Vehicle"("companyId", "plateNumber");
