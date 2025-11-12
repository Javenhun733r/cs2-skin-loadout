/*
  Warnings:

  - Added the required column `accentColorHex` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondaryColorHex` to the `Skin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Skin" ADD COLUMN     "accentColorHex" VARCHAR(7) NOT NULL,
ADD COLUMN     "secondaryColorHex" VARCHAR(7) NOT NULL;
