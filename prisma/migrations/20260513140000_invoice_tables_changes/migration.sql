-- Add fields to Invoice table
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "freight"       DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "sundries"      DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "labour"        DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "rounding"      DECIMAL(6,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "externalNotes" TEXT;

-- Create InvoiceItem table
CREATE TABLE IF NOT EXISTS "admin"."InvoiceItem" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "invoiceId"   TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL,
  "unitPrice"   DECIMAL(10,2) NOT NULL,
  "discountPct" DECIMAL(5,2),
  "lineTotal"   DECIMAL(12,2),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "admin"."Invoice"("id") ON DELETE CASCADE,
  CONSTRAINT "InvoiceItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id")
);

-- Add fields to Invoice table
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "freight"       DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "sundries"      DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "labour"        DECIMAL(10,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "rounding"      DECIMAL(6,2);
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "admin"."Invoice" ADD COLUMN IF NOT EXISTS "externalNotes" TEXT;

-- Create InvoiceItem table
CREATE TABLE IF NOT EXISTS "admin"."InvoiceItem" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "invoiceId"   TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL,
  "unitPrice"   DECIMAL(10,2) NOT NULL,
  "discountPct" DECIMAL(5,2),
  "lineTotal"   DECIMAL(12,2),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "admin"."Invoice"("id") ON DELETE CASCADE,
  CONSTRAINT "InvoiceItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id")
);