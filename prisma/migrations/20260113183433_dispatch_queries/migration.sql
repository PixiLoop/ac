/*
  Warnings:

  - You are about to drop the column `dispatchAccountName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchAccountNo` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchCharge` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchMethod` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchReference` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admin"."Customer" DROP COLUMN "dispatchAccountName",
DROP COLUMN "dispatchAccountNo",
DROP COLUMN "dispatchCharge",
DROP COLUMN "dispatchMethod",
DROP COLUMN "dispatchReference";

-- CreateTable
CREATE TABLE "admin"."CustomerDispatch" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "accountNo" TEXT,
    "accountName" TEXT,
    "charge" DECIMAL(10,2),
    "reference" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerDispatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admin"."CustomerDispatch" ADD CONSTRAINT "CustomerDispatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "admin"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
