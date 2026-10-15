/*
  Warnings:

  - You are about to drop the column `itemId` on the `FMInstallDetail` table. All the data in the column will be lost.
  - You are about to drop the column `monitorDetails` on the `FMInstallDetail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[preinstallId]` on the table `FMInstallDetail` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `preinstallId` to the `FMInstallDetail` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admin"."FMInstallDetail" DROP CONSTRAINT "FMInstallDetail_itemId_fkey";

-- DropIndex
DROP INDEX "admin"."FMInstallDetail_itemId_key";

-- AlterTable
ALTER TABLE "admin"."FMInstallDetail" DROP COLUMN "itemId",
DROP COLUMN "monitorDetails",
ADD COLUMN     "aiOption" BOOLEAN,
ADD COLUMN     "cameraCount" INTEGER,
ADD COLUMN     "cameraType" TEXT,
ADD COLUMN     "mixSim1" BOOLEAN,
ADD COLUMN     "mixSim2" BOOLEAN,
ADD COLUMN     "preinstallId" TEXT NOT NULL,
ADD COLUMN     "rimOption" BOOLEAN,
ADD COLUMN     "tmaOption" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "FMInstallDetail_preinstallId_key" ON "admin"."FMInstallDetail"("preinstallId");

-- AddForeignKey
ALTER TABLE "admin"."FMInstallDetail" ADD CONSTRAINT "FMInstallDetail_preinstallId_fkey" FOREIGN KEY ("preinstallId") REFERENCES "admin"."FMPreinstall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
