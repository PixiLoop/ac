-- AlterTable
ALTER TABLE "admin"."Customer" ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankBsb" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "dispatchAccountName" TEXT,
ADD COLUMN     "dispatchAccountNo" TEXT,
ADD COLUMN     "dispatchCharge" DECIMAL(10,2),
ADD COLUMN     "dispatchMethod" TEXT,
ADD COLUMN     "dispatchReference" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "salesFactor" DECIMAL(6,2);
