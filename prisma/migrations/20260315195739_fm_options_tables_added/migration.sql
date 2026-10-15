/*
  Warnings:

  - You are about to drop the `FMInstallLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FMPreinstall` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FMPreinstallItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey (guarded — these tables may never have been created)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'admin' AND table_name = 'FMInstallLog') THEN
    ALTER TABLE "admin"."FMInstallLog" DROP CONSTRAINT IF EXISTS "FMInstallLog_customerId_fkey";
    ALTER TABLE "admin"."FMInstallLog" DROP CONSTRAINT IF EXISTS "FMInstallLog_preinstallId_fkey";
    ALTER TABLE "admin"."FMInstallLog" DROP CONSTRAINT IF EXISTS "FMInstallLog_productId_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'admin' AND table_name = 'FMPreinstall') THEN
    ALTER TABLE "admin"."FMPreinstall" DROP CONSTRAINT IF EXISTS "FMPreinstall_customerId_fkey";
    ALTER TABLE "admin"."FMPreinstall" DROP CONSTRAINT IF EXISTS "FMPreinstall_salesOrderId_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'admin' AND table_name = 'FMPreinstallItem') THEN
    ALTER TABLE "admin"."FMPreinstallItem" DROP CONSTRAINT IF EXISTS "FMPreinstallItem_preinstallId_fkey";
    ALTER TABLE "admin"."FMPreinstallItem" DROP CONSTRAINT IF EXISTS "FMPreinstallItem_productId_fkey";
  END IF;
END $$;

-- DropTable
DROP TABLE IF EXISTS "admin"."FMInstallLog";

-- DropTable
DROP TABLE IF EXISTS "admin"."FMPreinstall";

-- DropTable
DROP TABLE IF EXISTS "admin"."FMPreinstallItem";

-- DropEnum
DROP TYPE IF EXISTS "admin"."InstallStatus";

-- DropEnum
DROP TYPE IF EXISTS "admin"."PreinstallStatus";

-- DropEnum
DROP TYPE IF EXISTS "admin"."PreinstallType";

-- CreateTable
CREATE TABLE "admin"."FMOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hasCharge" BOOLEAN NOT NULL DEFAULT true,
    "hasVehicleCount" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMCustomerOption" (
    "id" TEXT NOT NULL,
    "fmCustomerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "charge" DECIMAL(10,2),
    "vehicleCount" INTEGER,

    CONSTRAINT "FMCustomerOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FMOption_code_key" ON "admin"."FMOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FMCustomerOption_fmCustomerId_optionId_key" ON "admin"."FMCustomerOption"("fmCustomerId", "optionId");

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerOption" ADD CONSTRAINT "FMCustomerOption_fmCustomerId_fkey" FOREIGN KEY ("fmCustomerId") REFERENCES "admin"."FMCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerOption" ADD CONSTRAINT "FMCustomerOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "admin"."FMOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
