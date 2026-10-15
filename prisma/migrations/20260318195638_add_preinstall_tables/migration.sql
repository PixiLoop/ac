-- CreateEnum
CREATE TYPE "admin"."PreinstallStatus" AS ENUM ('NOT_ACTIONED', 'WORKSHOP_SETUP', 'WAITING_INSTALL', 'INSTALLED', 'INVOICED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "admin"."PreinstallType" AS ENUM ('NEW_INSTALL', 'WARRANTY', 'REPLACEMENT', 'CHANGE_INSTALL');

-- CreateEnum
CREATE TYPE "admin"."InstallStatus" AS ENUM ('ACTIVE', 'DECOMMISSIONED');

-- CreateTable
CREATE TABLE "admin"."FMPreinstall" (
    "id" TEXT NOT NULL,
    "preinstallNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fmCustomerId" TEXT NOT NULL,
    "status" "admin"."PreinstallStatus" NOT NULL DEFAULT 'NOT_ACTIONED',
    "type" "admin"."PreinstallType" NOT NULL,
    "assignedUserId" TEXT,
    "createdBy" TEXT NOT NULL,
    "orderNumber" TEXT,
    "abnEntry" TEXT,
    "termsOfTrade" TEXT,
    "generalSalesFactor" DECIMAL(6,2),
    "retailPrice" DECIMAL(10,2),
    "shippingName" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingAddress3" TEXT,
    "billingName" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingAddress3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FMPreinstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMPreinstallItem" (
    "id" TEXT NOT NULL,
    "preinstallId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "lineTotal" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FMPreinstallItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMInstallDetail" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "installType" TEXT,
    "fmUnitType" TEXT,
    "fmUnitCode" TEXT,
    "modem4G" BOOLEAN,
    "serviceCode" TEXT,
    "mixCode" TEXT,
    "mixOrgId" TEXT,
    "monitorDetails" TEXT,
    "unitSim" TEXT,
    "unitSerial" TEXT,
    "unitIMEI" TEXT,
    "visionType" TEXT,
    "standard" BOOLEAN,
    "highDefinition" BOOLEAN,
    "ai" BOOLEAN,
    "multiNetwork" BOOLEAN,
    "visSim" TEXT,
    "visIMEI" TEXT,
    "vis2Serial" TEXT,
    "vis3Serial" TEXT,
    "vis4Serial" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "yearVariant" TEXT,
    "vinNumber" TEXT,
    "regoNumber" TEXT,
    "installLocation" TEXT,
    "installer" TEXT,
    "installDate" TIMESTAMP(3),
    "installStatus" "admin"."InstallStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMInstallDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FMPreinstall_preinstallNo_key" ON "admin"."FMPreinstall"("preinstallNo");

-- CreateIndex
CREATE UNIQUE INDEX "FMInstallDetail_itemId_key" ON "admin"."FMInstallDetail"("itemId");

-- AddForeignKey
ALTER TABLE "admin"."FMPreinstall" ADD CONSTRAINT "FMPreinstall_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMPreinstall" ADD CONSTRAINT "FMPreinstall_fmCustomerId_fkey" FOREIGN KEY ("fmCustomerId") REFERENCES "admin"."FMCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMPreinstallItem" ADD CONSTRAINT "FMPreinstallItem_preinstallId_fkey" FOREIGN KEY ("preinstallId") REFERENCES "admin"."FMPreinstall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMPreinstallItem" ADD CONSTRAINT "FMPreinstallItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "admin"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMInstallDetail" ADD CONSTRAINT "FMInstallDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "admin"."FMPreinstallItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
