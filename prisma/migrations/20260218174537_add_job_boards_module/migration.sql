-- CreateTable
CREATE TABLE "admin"."JobBoard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JobBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."JobList" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JobList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."JobCard" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobBoard_deletedAt_idx" ON "admin"."JobBoard"("deletedAt");

-- CreateIndex
CREATE INDEX "JobList_boardId_idx" ON "admin"."JobList"("boardId");

-- CreateIndex
CREATE INDEX "JobList_sortOrder_idx" ON "admin"."JobList"("sortOrder");

-- CreateIndex
CREATE INDEX "JobCard_listId_idx" ON "admin"."JobCard"("listId");

-- CreateIndex
CREATE INDEX "JobCard_sortOrder_idx" ON "admin"."JobCard"("sortOrder");

-- AddForeignKey
ALTER TABLE "admin"."JobList" ADD CONSTRAINT "JobList_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "admin"."JobBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."JobCard" ADD CONSTRAINT "JobCard_listId_fkey" FOREIGN KEY ("listId") REFERENCES "admin"."JobList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
