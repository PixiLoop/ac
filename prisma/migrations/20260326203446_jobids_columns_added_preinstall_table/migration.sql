/*
  Warnings:

  - The values [CHANGE_INSTALL] on the enum `PreinstallType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "admin"."PreinstallType_new" AS ENUM ('NEW_INSTALL', 'WARRANTY', 'REPLACEMENT', 'MODIFIED_INSTALL', 'TRANSFER_UNIT');
ALTER TABLE "admin"."FMPreinstall" ALTER COLUMN "type" TYPE "admin"."PreinstallType_new" USING ("type"::text::"admin"."PreinstallType_new");
ALTER TYPE "admin"."PreinstallType" RENAME TO "PreinstallType_old";
ALTER TYPE "admin"."PreinstallType_new" RENAME TO "PreinstallType";
DROP TYPE "admin"."PreinstallType_old";
COMMIT;

-- AlterTable
ALTER TABLE "admin"."FMPreinstall" ADD COLUMN     "installId" TEXT,
ADD COLUMN     "installJobId" TEXT,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "jobId" TEXT;
