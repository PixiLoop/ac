/*
  Warnings:

  - You are about to drop the column `fmServiceId` on the `FMCustomerService` table. All the data in the column will be lost.
  - You are about to drop the column `partNumber` on the `SalesOrderItem` table. All the data in the column will be lost.
  - You are about to drop the `FMService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FMServicePrice` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fmCustomerId,productId]` on the table `FMCustomerService` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `FMCustomerService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admin"."FMCustomerService" DROP CONSTRAINT "FMCustomerService_fmServiceId_fkey";

-- DropForeignKey
ALTER TABLE "admin"."FMServicePrice" DROP CONSTRAINT "FMServicePrice_fmServiceId_fkey";

-- DropIndex
DROP INDEX "admin"."FMCustomerService_fmCustomerId_fmServiceId_key";

-- AlterTable
ALTER TABLE "admin"."FMCustomerService" DROP COLUMN "fmServiceId",
ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admin"."SalesOrderItem" DROP COLUMN "partNumber",
ADD COLUMN     "productId" TEXT NOT NULL;

-- DropTable
DROP TABLE "admin"."FMService";

-- DropTable
DROP TABLE "admin"."FMServicePrice";

-- CreateTable
CREATE TABLE "admin"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "parentProductId" TEXT,
    "productCategory" TEXT NOT NULL,
    "status" TEXT,
    "replacedBy" TEXT,
    "billOfGoods" BOOLEAN NOT NULL DEFAULT false,
    "fieldServiceType" TEXT,
    "decimalsSupported" BOOLEAN NOT NULL DEFAULT false,
    "defaultUnit" TEXT,
    "unitGroup" TEXT,
    "vendorName" TEXT,
    "vendorNumber" TEXT,
    "vendorWeb" TEXT,
    "vendorPartNumber" TEXT,
    "reorderLogic" TEXT,
    "automaticMaxQty" INTEGER,
    "automaticMinQty" INTEGER,
    "fixedMinQty" INTEGER,
    "fixedMaxQty" INTEGER,
    "isFmHardware" BOOLEAN NOT NULL DEFAULT false,
    "isMonitor" BOOLEAN NOT NULL DEFAULT false,
    "fmUnitType" TEXT,
    "fmUnitCode" TEXT,
    "fourGUnitModem" BOOLEAN NOT NULL DEFAULT false,
    "mixUnitSim" BOOLEAN NOT NULL DEFAULT false,
    "fuelRebate" BOOLEAN NOT NULL DEFAULT false,
    "internSim" BOOLEAN NOT NULL DEFAULT false,
    "rimOption" BOOLEAN NOT NULL DEFAULT false,
    "nrcOption" BOOLEAN NOT NULL DEFAULT false,
    "tmaOption" BOOLEAN NOT NULL DEFAULT false,
    "isVision" BOOLEAN NOT NULL DEFAULT false,
    "vision4GDevice" BOOLEAN NOT NULL DEFAULT false,
    "standardVision" BOOLEAN NOT NULL DEFAULT false,
    "highDefinition" BOOLEAN NOT NULL DEFAULT false,
    "aiOption" BOOLEAN NOT NULL DEFAULT false,
    "cameraCount" INTEGER,
    "mixVisSim" BOOLEAN NOT NULL DEFAULT false,
    "vision4GModem" BOOLEAN NOT NULL DEFAULT false,
    "netSupplierBuyPrice" DECIMAL(12,2),
    "importDuty" DECIMAL(6,2),
    "importMarkup" DECIMAL(6,2),
    "landedCost" DECIMAL(12,2),
    "aircoMarkupGroup" TEXT,
    "agentPrice" DECIMAL(12,2),
    "salesPartnerPrice" DECIMAL(12,2),
    "tradePrice" DECIMAL(12,2),
    "retailPrice" DECIMAL(12,2),
    "salesMargin" DECIMAL(6,2),
    "sellingPrice" DECIMAL(12,2),
    "gstPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "admin"."Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "FMCustomerService_fmCustomerId_productId_key" ON "admin"."FMCustomerService"("fmCustomerId", "productId");

-- AddForeignKey
ALTER TABLE "admin"."SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerService" ADD CONSTRAINT "FMCustomerService_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
