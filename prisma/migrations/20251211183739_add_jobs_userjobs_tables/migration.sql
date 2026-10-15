-- AlterTable
ALTER TABLE "auth"."User" ADD COLUMN     "defaultLandingPage" TEXT;

-- CreateTable
CREATE TABLE "admin"."Job" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "shortAddress" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."UserJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "admin"."Job"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserJob_userId_jobId_key" ON "admin"."UserJob"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "admin"."UserJob" ADD CONSTRAINT "UserJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin"."UserJob" ADD CONSTRAINT "UserJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "admin"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
