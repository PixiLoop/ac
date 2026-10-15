/*
  Warnings:

  - A unique constraint covering the columns `[segment,type,code,label]` on the table `FMServiceSegment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "admin"."FMServiceSegment_segment_type_code_label_dependsOn_key";

-- CreateIndex
CREATE UNIQUE INDEX "FMServiceSegment_segment_type_code_label_key" ON "admin"."FMServiceSegment"("segment", "type", "code", "label");
