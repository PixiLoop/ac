-- DropIndex
DROP INDEX "auth"."User_email_key";

-- AlterTable
ALTER TABLE "auth"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3);
