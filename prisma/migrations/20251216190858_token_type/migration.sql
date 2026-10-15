-- CreateEnum
CREATE TYPE "auth"."TokenType" AS ENUM ('PASSWORD_RESET', 'ACCOUNT_ACTIVATION');

-- AlterTable
ALTER TABLE "auth"."PasswordResetToken" ADD COLUMN     "type" "auth"."TokenType" NOT NULL DEFAULT 'PASSWORD_RESET';
