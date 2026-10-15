-- CreateEnum
CREATE TYPE "admin"."QuoteItemGroup" AS ENUM ('PREMIUM', 'ESSENTIAL', 'ONGOING');

-- CreateEnum
CREATE TYPE "admin"."QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "admin"."Quotation" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "admin"."QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "actionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "priceLevel" "admin"."PriceLevel" NOT NULL,
    "salesFactor" DECIMAL(6,2),
    "paymentTerms" "admin"."PaymentTerms",
    "hasPremium" BOOLEAN NOT NULL DEFAULT false,
    "hasEssential" BOOLEAN NOT NULL DEFAULT false,
    "hasOngoing" BOOLEAN NOT NULL DEFAULT false,
    "shippingName" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingAddress3" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostcode" TEXT,
    "shippingCountry" TEXT,
    "billingName" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingAddress3" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "salesOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."QuotationGroup" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "groupType" "admin"."QuoteItemGroup" NOT NULL,
    "subtotal" DECIMAL(12,2),
    "gst" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QuotationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "lineTotal" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quoteNumber_key" ON "admin"."Quotation"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationGroup_quotationId_groupType_key" ON "admin"."QuotationGroup"("quotationId", "groupType");

-- AddForeignKey
ALTER TABLE "admin"."Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."Quotation" ADD CONSTRAINT "Quotation_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "admin"."SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."QuotationGroup" ADD CONSTRAINT "QuotationGroup_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "admin"."Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "admin"."Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."QuotationItem" ADD CONSTRAINT "QuotationItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "admin"."QuotationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
