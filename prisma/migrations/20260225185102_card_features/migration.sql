-- CreateTable
CREATE TABLE "admin"."CardMember" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CardLabel" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "CardLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CardChecklist" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "CardChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CardChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CardChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."BoardCustomField" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "BoardCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."CardCustomFieldValue" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "CardCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardMember_cardId_userId_key" ON "admin"."CardMember"("cardId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardCustomFieldValue_cardId_fieldId_key" ON "admin"."CardCustomFieldValue"("cardId", "fieldId");

-- AddForeignKey
ALTER TABLE "admin"."CardMember" ADD CONSTRAINT "CardMember_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "admin"."JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardMember" ADD CONSTRAINT "CardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardLabel" ADD CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "admin"."JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardChecklist" ADD CONSTRAINT "CardChecklist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "admin"."JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardChecklistItem" ADD CONSTRAINT "CardChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "admin"."CardChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."BoardCustomField" ADD CONSTRAINT "BoardCustomField_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "admin"."JobBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardCustomFieldValue" ADD CONSTRAINT "CardCustomFieldValue_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "admin"."JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."CardCustomFieldValue" ADD CONSTRAINT "CardCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "admin"."BoardCustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
