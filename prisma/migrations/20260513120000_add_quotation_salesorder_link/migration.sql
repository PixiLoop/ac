-- Add quotationId column to SalesOrder table
ALTER TABLE "admin"."SalesOrder" ADD COLUMN IF NOT EXISTS "quotationId" TEXT;

-- Add foreign key constraint
ALTER TABLE "admin"."SalesOrder" 
ADD CONSTRAINT "SalesOrder_quotationId_fkey" 
FOREIGN KEY ("quotationId") 
REFERENCES "admin"."Quotation"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;