/*
  Warnings:

  - You are about to drop the column `category` on the `menu_items` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "menu_items_category_idx";

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "menu_items_categoryId_idx" ON "menu_items"("categoryId");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
