-- Normalised phone for duplicate detection: digits only, +855/855 -> leading 0.
DROP INDEX "customers_phone_idx";

ALTER TABLE "customers" ADD COLUMN "phoneNormalized" TEXT;

UPDATE "customers"
SET "phoneNormalized" = CASE
  WHEN regexp_replace("phone", '\D', '', 'g') LIKE '855%'
    THEN '0' || substr(regexp_replace("phone", '\D', '', 'g'), 4)
  ELSE regexp_replace("phone", '\D', '', 'g')
END;

ALTER TABLE "customers" ALTER COLUMN "phoneNormalized" SET NOT NULL;

CREATE INDEX "customers_phoneNormalized_idx" ON "customers"("phoneNormalized");
