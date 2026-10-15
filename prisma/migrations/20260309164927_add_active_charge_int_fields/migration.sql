-- AlterTable
ALTER TABLE "admin"."FMCustomerService" ADD COLUMN     "active" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "charge" INTEGER NOT NULL DEFAULT 0;
