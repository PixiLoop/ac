/*
  Warnings:

  - You are about to drop the column `actionDate` on the `Quotation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admin"."Quotation" DROP COLUMN "actionDate",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "quotationDate" TIMESTAMP(3),
ADD COLUMN     "requestNumber" TEXT;
