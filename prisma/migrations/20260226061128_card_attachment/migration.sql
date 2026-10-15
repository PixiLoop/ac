-- CreateTable
CREATE TABLE "admin"."CardAttachment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardAttachment_cardId_idx" ON "admin"."CardAttachment"("cardId");

-- AddForeignKey
ALTER TABLE "admin"."CardAttachment" ADD CONSTRAINT "CardAttachment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "admin"."JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
