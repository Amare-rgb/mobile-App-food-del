/*
  Warnings:

  - A unique constraint covering the columns `[txRef]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "txRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_txRef_key" ON "orders"("txRef");
