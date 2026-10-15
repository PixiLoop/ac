UPDATE "admin"."FMServiceSegment"
SET "label" = 'Tabs / Beame', "updatedAt" = NOW()
WHERE "type" = 'BASE_UNIT' AND "code" = 'FM_TABS';
