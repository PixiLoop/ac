/*
  Warnings:

  - A unique constraint covering the columns `[customerId]` on the table `FMCustomer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fmWebNumber]` on the table `FMCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FMCustomer_customerId_key" ON "admin"."FMCustomer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "FMCustomer_fmWebNumber_key" ON "admin"."FMCustomer"("fmWebNumber");
