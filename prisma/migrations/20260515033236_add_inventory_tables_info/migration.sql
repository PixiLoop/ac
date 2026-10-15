/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateEnum
CREATE TYPE "inventory"."InventoryAliasAction" AS ENUM ('SUBSTITUTE', 'SUPERSEDE', 'ALIAS');

-- CreateEnum
CREATE TYPE "inventory"."InvSupplierStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "admin"."InvOrderMethod" AS ENUM ('EMAIL', 'PHONE', 'EDI', 'PORTAL');

-- CreateEnum
CREATE TYPE "admin"."InvDispatchMethod" AS ENUM ('SUPPLIER_CARRIER', 'OWN_FLEET', 'CUSTOMER_PICKUP', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "inventory"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory"."GoodsReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory"."StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'STOCKTAKE', 'RETURN', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "inventory"."StockDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "inventory"."ImportMode" AS ENUM ('ADD_ONLY', 'UPDATE_ONLY', 'ADD_OR_UPDATE');

-- CreateEnum
CREATE TYPE "inventory"."ImportBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "inventory"."ImportRowResult" AS ENUM ('ADDED', 'UPDATED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "inventory"."InvReferenceModule" AS ENUM ('SALES_ORDER', 'INVOICE', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'JOB', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "inventory"."PriceGroupType" AS ENUM ('AIRCO', 'XGROUP', 'VARIABLE');

-- CreateEnum
CREATE TYPE "inventory"."PriceGroupMode" AS ENUM ('FACTOR', 'MARGIN', 'FIXED');

-- AlterTable
ALTER TABLE "admin"."Invoice" ADD COLUMN     "billingAddress1" TEXT,
ADD COLUMN     "billingAddress2" TEXT,
ADD COLUMN     "billingAddress3" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingPostcode" TEXT,
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "shippingAddress1" TEXT,
ADD COLUMN     "shippingAddress2" TEXT,
ADD COLUMN     "shippingAddress3" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingName" TEXT,
ADD COLUMN     "shippingPostcode" TEXT,
ADD COLUMN     "shippingState" TEXT;

-- AlterTable
ALTER TABLE "admin"."Product" ADD COLUMN     "agentFactor" DECIMAL(8,4),
ADD COLUMN     "allowBackOrder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "averageCost" DECIMAL(12,4),
ADD COLUMN     "backOrdered" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "bin" TEXT,
ADD COLUMN     "committed" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "extendedDescription" TEXT,
ADD COLUMN     "fmRuleCode" TEXT,
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "inStoreCost" DECIMAL(12,2),
ADD COLUMN     "isSerialized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTaxable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isWeighed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemType" TEXT,
ADD COLUMN     "landedFactor" INTEGER,
ADD COLUMN     "lastStocktakeDate" TIMESTAMP(3),
ADD COLUMN     "lastStocktakeQty" DECIMAL(12,3),
ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "location1" INTEGER,
ADD COLUMN     "location2" INTEGER,
ADD COLUMN     "maxStock" DECIMAL(12,3),
ADD COLUMN     "minStock" DECIMAL(12,3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "onHand" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "onOrder" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "orderRank" TEXT,
ADD COLUMN     "packSize" INTEGER,
ADD COLUMN     "partnerFactor" DECIMAL(8,4),
ADD COLUMN     "primarySupplierId" TEXT,
ADD COLUMN     "reorderPoint" DECIMAL(12,3),
ADD COLUMN     "reorderQty" DECIMAL(12,3),
ADD COLUMN     "retailFactor" DECIMAL(8,4),
ADD COLUMN     "standardCost" DECIMAL(12,4),
ADD COLUMN     "supplierCode" TEXT,
ADD COLUMN     "supplierStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN     "tradeFactor" DECIMAL(8,4),
ADD COLUMN     "volume" DECIMAL(10,3),
ADD COLUMN     "weight" DECIMAL(10,3),
ADD COLUMN     "xGroup" TEXT;

-- CreateTable
CREATE TABLE "inventory"."InvCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvAircoGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "groupLetter" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "agentFactor" DECIMAL(8,4) NOT NULL,
    "partnerFactor" DECIMAL(8,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvAircoGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvVariableMarginTier" (
    "id" TEXT NOT NULL,
    "landedLessThan" DECIMAL(12,2) NOT NULL,
    "kRetailFactor" DECIMAL(8,4) NOT NULL,
    "kTradeFactor" DECIMAL(8,4) NOT NULL,
    "kThreshold" DECIMAL(8,4) NOT NULL,
    "aRetailFactor" DECIMAL(8,4) NOT NULL,
    "aTradeFactor" DECIMAL(8,4) NOT NULL,
    "aThreshold" DECIMAL(8,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvVariableMarginTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvXGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "agentFactor" DECIMAL(8,4) NOT NULL,
    "partnerFactor" DECIMAL(8,4) NOT NULL,
    "tradeFactor" DECIMAL(8,4) NOT NULL,
    "retailFactor" DECIMAL(8,4) NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvXGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvPriceSettings" (
    "id" TEXT NOT NULL,
    "roundBelow50" INTEGER NOT NULL DEFAULT 20,
    "roundBelow100" INTEGER NOT NULL DEFAULT 50,
    "roundAbove100" INTEGER NOT NULL DEFAULT 100,
    "priceOffset" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "minSalesPrice" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvPriceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvSupplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "inventory"."InvSupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "abn" TEXT,
    "deliveryAddress1" TEXT,
    "deliveryAddress2" TEXT,
    "deliveryAddress3" TEXT,
    "postalAddress1" TEXT,
    "postalAddress2" TEXT,
    "postalAddress3" TEXT,
    "serviceRep" TEXT,
    "orderPhone" TEXT,
    "orderEmail" TEXT,
    "ordersClose" TEXT,
    "minOrderValue" DECIMAL(12,2),
    "freightCost" DECIMAL(12,2),
    "freightCutsAt" DECIMAL(12,2),
    "airBagClose" TEXT,
    "airBagCost" DECIMAL(12,2),
    "orderLandedFactor" DECIMAL(10,4),
    "orderMethod" "admin"."InvOrderMethod" DEFAULT 'EMAIL',
    "dispatchMethod" "admin"."InvDispatchMethod" DEFAULT 'SUPPLIER_CARRIER',
    "useSupplierPartNumber" BOOLEAN NOT NULL DEFAULT false,
    "activeSupplierForAai" BOOLEAN NOT NULL DEFAULT false,
    "expenseTypeCode" TEXT,
    "expenseTypeKey" TEXT,
    "repContactName" TEXT,
    "repContactPhone" TEXT,
    "repContactMobile" TEXT,
    "repContactEmail" TEXT,
    "accContactName" TEXT,
    "accContactPhone" TEXT,
    "accContactFax" TEXT,
    "accContactEmail" TEXT,
    "warContactName" TEXT,
    "warContactPhone" TEXT,
    "warContactFax" TEXT,
    "warContactEmail" TEXT,
    "tradingTerms" TEXT,
    "paymentMethod" TEXT,
    "billerCodeBsb" TEXT,
    "accountReference" TEXT,
    "creditLimit" DECIMAL(12,2),
    "currencyCode" TEXT DEFAULT 'AUD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."PurchaseOrder" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "inventory"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2),
    "gst" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderedQty" DECIMAL(12,3) NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "lineTotal" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."GoodsReceipt" (
    "id" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" UUID,
    "status" "inventory"."GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."GoodsReceiptLine" (
    "id" UUID NOT NULL,
    "goodsReceiptId" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "lineTotal" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."StockMovement" (
    "id" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" "inventory"."StockMovementType" NOT NULL,
    "direction" "inventory"."StockDirection" NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,4),
    "totalCost" DECIMAL(12,2),
    "balanceAfter" DECIMAL(12,3),
    "referenceModule" "inventory"."InvReferenceModule",
    "referenceId" UUID,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."ImportBatch" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "importMode" "inventory"."ImportMode" NOT NULL,
    "status" "inventory"."ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "addedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."ImportRow" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "result" "inventory"."ImportRowResult",
    "errorMessage" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."InvPriceGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "inventory"."PriceGroupType" NOT NULL,
    "mode" "inventory"."PriceGroupMode" NOT NULL,
    "level" INTEGER NOT NULL,
    "retailFactor" DECIMAL(8,4),
    "tradeFactor" DECIMAL(8,4),
    "threshold" DECIMAL(12,2),
    "roundAt" DECIMAL(8,2),
    "priceOffset" DECIMAL(8,2),
    "minPrice" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvPriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."PriceGroupItem" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "overridePct" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceGroupItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."ProductAlias" (
    "id" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "action" "inventory"."InventoryAliasAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."ProductBogLine" (
    "id" TEXT NOT NULL,
    "parentProductId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBogLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvCategory_code_key" ON "inventory"."InvCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvAircoGroup_code_key" ON "inventory"."InvAircoGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvXGroup_code_key" ON "inventory"."InvXGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvSupplier_code_key" ON "inventory"."InvSupplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orderNumber_key" ON "inventory"."PurchaseOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_receiptNumber_key" ON "inventory"."GoodsReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "inventory"."StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceGroupItem_groupId_productId_key" ON "inventory"."PriceGroupItem"("groupId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlias_sourceProductId_targetProductId_key" ON "admin"."ProductAlias"("sourceProductId", "targetProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBogLine_parentProductId_componentId_key" ON "admin"."ProductBogLine"("parentProductId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "auth"."User"("email");

-- AddForeignKey
ALTER TABLE "admin"."Product" ADD CONSTRAINT "Product_primarySupplierId_fkey" FOREIGN KEY ("primarySupplierId") REFERENCES "inventory"."InvSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "inventory"."InvSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "inventory"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "inventory"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "inventory"."InvSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "inventory"."GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory"."ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."ImportRow" ADD CONSTRAINT "ImportRow_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."PriceGroupItem" ADD CONSTRAINT "PriceGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "inventory"."InvPriceGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."PriceGroupItem" ADD CONSTRAINT "PriceGroupItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."ProductAlias" ADD CONSTRAINT "ProductAlias_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."ProductAlias" ADD CONSTRAINT "ProductAlias_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."ProductBogLine" ADD CONSTRAINT "ProductBogLine_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."ProductBogLine" ADD CONSTRAINT "ProductBogLine_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
