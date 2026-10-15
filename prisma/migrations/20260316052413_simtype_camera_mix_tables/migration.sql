-- CreateEnum
CREATE TYPE "admin"."FMServiceType" AS ENUM ('CAMERA', 'SIM_TYPE', 'MIX_SIM', 'MIX_VISION', 'MIX_UNIT');

-- CreateTable
CREATE TABLE "admin"."FMServiceMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "admin"."FMServiceType" NOT NULL,
    "hasActive" BOOLEAN NOT NULL DEFAULT false,
    "hasPrice" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMServiceMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMCustomerServiceItem" (
    "id" TEXT NOT NULL,
    "fmCustomerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "numItems" INTEGER NOT NULL DEFAULT 0,
    "active" INTEGER,
    "price" DECIMAL(10,2),

    CONSTRAINT "FMCustomerServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FMServiceMaster_code_key" ON "admin"."FMServiceMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FMCustomerServiceItem_fmCustomerId_serviceId_key" ON "admin"."FMCustomerServiceItem"("fmCustomerId", "serviceId");

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerServiceItem" ADD CONSTRAINT "FMCustomerServiceItem_fmCustomerId_fkey" FOREIGN KEY ("fmCustomerId") REFERENCES "admin"."FMCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerServiceItem" ADD CONSTRAINT "FMCustomerServiceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "admin"."FMServiceMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
