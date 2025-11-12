/*
  Warnings:

  - You are about to drop the column `accentColorHex` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColorHex` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryColorHex` on the `Skin` table. All the data in the column will be lost.
  - Added the required column `accentB` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accentG` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accentR` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryB` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryG` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryR` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondaryB` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondaryG` to the `Skin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondaryR` to the `Skin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Skin" DROP COLUMN "accentColorHex",
DROP COLUMN "primaryColorHex",
DROP COLUMN "secondaryColorHex",
ADD COLUMN     "accentB" INTEGER NOT NULL,
ADD COLUMN     "accentG" INTEGER NOT NULL,
ADD COLUMN     "accentR" INTEGER NOT NULL,
ADD COLUMN     "primaryB" INTEGER NOT NULL,
ADD COLUMN     "primaryG" INTEGER NOT NULL,
ADD COLUMN     "primaryR" INTEGER NOT NULL,
ADD COLUMN     "secondaryB" INTEGER NOT NULL,
ADD COLUMN     "secondaryG" INTEGER NOT NULL,
ADD COLUMN     "secondaryR" INTEGER NOT NULL;
