ALTER TYPE "admin"."SalesOrderType" ADD VALUE IF NOT EXISTS 'FORWARD';
ALTER TYPE "admin"."SalesOrderType" ADD VALUE IF NOT EXISTS 'WITH_OTHER_GOODS';

UPDATE "admin"."DispatchMethod"
SET "label" = 'With Other Goods', "isActive" = true, "updatedAt" = NOW()
WHERE "code" = 'W.O.G';
