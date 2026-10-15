-- AlterTable
ALTER TABLE "admin"."SalesOrder" ADD COLUMN     "sameAsCustomer" BOOLEAN DEFAULT false,
ADD COLUMN     "shippingAddress1" TEXT,
ADD COLUMN     "shippingAddress2" TEXT,
ADD COLUMN     "shippingAddress3" TEXT,
ADD COLUMN     "shippingName" TEXT;
