ALTER TYPE "admin"."InvoiceType" ADD VALUE IF NOT EXISTS 'FMPREINSTALL';

UPDATE "admin"."Invoice" AS invoice
SET "invoiceType" = 'FMPREINSTALL'
WHERE EXISTS (
    SELECT 1
    FROM "admin"."FMPreinstall" AS preinstall
    WHERE preinstall."invoiceId" = invoice."id"
);
