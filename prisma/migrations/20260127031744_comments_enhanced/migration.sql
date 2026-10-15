-- CreateEnum
CREATE TYPE "admin"."CommentType" AS ENUM ('COMMENT', 'SYSTEM');

-- AlterTable
ALTER TABLE "admin"."Comment" ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "type" "admin"."CommentType" NOT NULL DEFAULT 'COMMENT';
