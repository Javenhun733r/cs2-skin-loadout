/*
  Warnings:

  - The primary key for the `Skin` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Skin" DROP CONSTRAINT "Skin_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Skin_pkey" PRIMARY KEY ("id");
