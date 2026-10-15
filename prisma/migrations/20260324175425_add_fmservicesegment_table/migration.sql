-- CreateTable
CREATE TABLE "admin"."FMServiceSegment" (
    "id" TEXT NOT NULL,
    "segment" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mixCode" TEXT,
    "mixIndex" INTEGER,
    "dependsOn" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FMServiceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FMServiceSegment_type_idx" ON "admin"."FMServiceSegment"("type");

-- CreateIndex
CREATE INDEX "FMServiceSegment_segment_idx" ON "admin"."FMServiceSegment"("segment");

-- CreateIndex
CREATE UNIQUE INDEX "FMServiceSegment_segment_type_code_label_dependsOn_key" ON "admin"."FMServiceSegment"("segment", "type", "code", "label", "dependsOn");
