-- AlterTable
ALTER TABLE "admin"."FMInstallDetail" ADD COLUMN     "addedC" TEXT,
ADD COLUMN     "baseVO" TEXT,
ADD COLUMN     "international" BOOLEAN,
ADD COLUMN     "muChargeCode" TEXT,
ADD COLUMN     "sim1Code" TEXT,
ADD COLUMN     "sim1Type" TEXT,
ADD COLUMN     "sim2Type" TEXT,
ADD COLUMN     "tachoData" BOOLEAN,
ADD COLUMN     "vis1Serial" TEXT,
ADD COLUMN     "visionCode" TEXT;

-- AlterTable
ALTER TABLE "admin"."FMPreinstall" ADD COLUMN     "chargeFreight" DECIMAL(12,2),
ADD COLUMN     "chargeGst" DECIMAL(12,2),
ADD COLUMN     "chargeLabour" DECIMAL(12,2),
ADD COLUMN     "chargeParts" DECIMAL(12,2),
ADD COLUMN     "chargeRounding" DECIMAL(6,2),
ADD COLUMN     "chargeSundries" DECIMAL(12,2),
ADD COLUMN     "chargeTotal" DECIMAL(12,2),
ADD COLUMN     "dispatchMethod" TEXT,
ADD COLUMN     "dispatchRef" TEXT;

-- CreateTable
CREATE TABLE "admin"."FMInstall" (
    "id" TEXT NOT NULL,
    "preinstallId" TEXT,
    "entryDate" TIMESTAMP(3),
    "installDate" TIMESTAMP(3),
    "installInvoice" TEXT,
    "author" TEXT,
    "installBy" TEXT,
    "aasCustomerNum" TEXT,
    "fmCustomerNum" TEXT,
    "mixOrgId" TEXT,
    "mixAssetNum" TEXT,
    "baseUnit" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" TEXT,
    "rego" TEXT,
    "fiNumber" TEXT,
    "depot" TEXT,
    "site" TEXT,
    "serviceNumber" INTEGER,
    "fmwService" TEXT,
    "mixCode" TEXT,
    "status" "admin"."InstallStatus",
    "commissionedDate" TIMESTAMP(3),
    "decommissionedDate" TIMESTAMP(3),
    "notCharged" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installDetailId" TEXT,

    CONSTRAINT "FMInstall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FMInstall_installDetailId_key" ON "admin"."FMInstall"("installDetailId");

-- AddForeignKey
ALTER TABLE "admin"."FMInstall" ADD CONSTRAINT "FMInstall_installDetailId_fkey" FOREIGN KEY ("installDetailId") REFERENCES "admin"."FMInstallDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
