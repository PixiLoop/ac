-- AlterTable
ALTER TABLE "admin"."JobBoard" ADD COLUMN     "description" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "JobBoard_userId_idx" ON "admin"."JobBoard"("userId");

-- AddForeignKey
ALTER TABLE "admin"."JobBoard" ADD CONSTRAINT "JobBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
