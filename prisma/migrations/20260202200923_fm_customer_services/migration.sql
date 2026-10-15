-- CreateTable
CREATE TABLE "admin"."FMService" (
    "id" TEXT NOT NULL,
    "serviceRef" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMServicePrice" (
    "id" TEXT NOT NULL,
    "fmServiceId" TEXT NOT NULL,
    "priceLevel" "admin"."PriceLevel" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FMServicePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMCustomer" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fmWebNumber" TEXT,
    "fleetName" TEXT,
    "mixOrgId" TEXT,
    "mixDBase" TEXT,
    "priceLevel" "admin"."PriceLevel" NOT NULL,
    "priceFactor" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."FMCustomerService" (
    "id" TEXT NOT NULL,
    "fmCustomerId" TEXT NOT NULL,
    "fmServiceId" TEXT NOT NULL,
    "numItems" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FMCustomerService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FMService_serviceRef_key" ON "admin"."FMService"("serviceRef");

-- CreateIndex
CREATE UNIQUE INDEX "FMServicePrice_fmServiceId_priceLevel_key" ON "admin"."FMServicePrice"("fmServiceId", "priceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "FMCustomerService_fmCustomerId_fmServiceId_key" ON "admin"."FMCustomerService"("fmCustomerId", "fmServiceId");

-- AddForeignKey
ALTER TABLE "admin"."FMServicePrice" ADD CONSTRAINT "FMServicePrice_fmServiceId_fkey" FOREIGN KEY ("fmServiceId") REFERENCES "admin"."FMService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomer" ADD CONSTRAINT "FMCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerService" ADD CONSTRAINT "FMCustomerService_fmCustomerId_fkey" FOREIGN KEY ("fmCustomerId") REFERENCES "admin"."FMCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."FMCustomerService" ADD CONSTRAINT "FMCustomerService_fmServiceId_fkey" FOREIGN KEY ("fmServiceId") REFERENCES "admin"."FMService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
