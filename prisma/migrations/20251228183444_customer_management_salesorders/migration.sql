-- CreateEnum
CREATE TYPE "admin"."CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OVERDUE', 'STOP_CREDIT', 'CLOSED');

-- CreateEnum
CREATE TYPE "admin"."AddressType" AS ENUM ('SHIPPING', 'POSTAL', 'STATEMENT', 'CHARGE');

-- CreateEnum
CREATE TYPE "admin"."ContactRole" AS ENUM ('GENERAL', 'INVOICE', 'STATEMENT');

-- CreateEnum
CREATE TYPE "admin"."PriceLevel" AS ENUM ('RETAIL', 'TRADE', 'SALES_PARTNER', 'AGENT');

-- CreateEnum
CREATE TYPE "admin"."PaymentTerms" AS ENUM ('DAYS_14', 'DAYS_30', 'DAYS_60', 'DAYS_90');

-- CreateEnum
CREATE TYPE "admin"."SalesOrderType" AS ENUM ('STANDARD', 'DIRECT_TO_CUSTOMER', 'WORKSHOP', 'FM_WEB', 'SPECIAL_ORDER');

-- CreateEnum
CREATE TYPE "admin"."SalesOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "admin"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "admin"."Customer" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registeredName" TEXT,
    "abn" TEXT,
    "gstNumber" TEXT,
    "status" "admin"."CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "fmCustomerNumber" TEXT,
    "orderRequired" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DECIMAL(12,2),
    "creditHold" BOOLEAN NOT NULL DEFAULT false,
    "creditHoldReason" TEXT,
    "gstExempt" BOOLEAN NOT NULL DEFAULT false,
    "priceLevel" "admin"."PriceLevel" NOT NULL DEFAULT 'RETAIL',
    "paymentTerms" "admin"."PaymentTerms" NOT NULL DEFAULT 'DAYS_30',
    "currentBalance" DECIMAL(12,2),
    "overdueAmount" DECIMAL(12,2),
    "primaryContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "fax" TEXT,
    "role" "admin"."ContactRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "admin"."AddressType" NOT NULL,
    "name" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "address3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."SalesOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderType" "admin"."SalesOrderType" NOT NULL,
    "status" "admin"."SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderedAt" TIMESTAMP(3),
    "actionDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "customerPO" TEXT,
    "internalNotes" TEXT,
    "externalNotes" TEXT,
    "priceLevel" "admin"."PriceLevel" NOT NULL,
    "salesFactor" DECIMAL(6,2),
    "freight" DECIMAL(10,2),
    "sundries" DECIMAL(10,2),
    "discountPct" DECIMAL(5,2),
    "subtotal" DECIMAL(12,2),
    "gst" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "taxRate" DECIMAL(5,2),
    "allocatedQty" INTEGER NOT NULL DEFAULT 0,
    "backOrderQty" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "status" "admin"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2),
    "gst" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "balanceDue" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "paidAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT,
    "reference" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "admin"."Customer"("customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "admin"."SalesOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "admin"."Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "admin"."CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "admin"."SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."Invoice" ADD CONSTRAINT "Invoice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "admin"."SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
