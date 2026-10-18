-- AlterEnum
BEGIN;

CREATE TYPE "OrderStatus_new" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'pending'   THEN 'pending'
    WHEN 'cancelled' THEN 'rejected'
    ELSE 'approved'
  END::"OrderStatus_new"
);

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';

COMMIT;