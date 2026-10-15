UPDATE "admin"."Invoice" AS original
SET "status" = 'REVERSED', "isLocked" = true
WHERE EXISTS (
    SELECT 1
    FROM "admin"."Invoice" AS reversal
    WHERE reversal."reversalOfInvoiceId" = original."id"
      AND reversal."deletedAt" IS NULL
      AND reversal."status" <> 'CANCELLED'
);
