/*
  Warnings:

  - You are about to drop the column `accentB` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `accentG` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `accentR` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `primaryB` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `primaryG` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `primaryR` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryB` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryG` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryR` on the `Skin` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Skin_accentB_idx";

-- DropIndex
DROP INDEX "Skin_accentG_idx";

-- DropIndex
DROP INDEX "Skin_accentR_idx";

-- DropIndex
DROP INDEX "Skin_primaryB_idx";

-- DropIndex
DROP INDEX "Skin_primaryG_idx";

-- DropIndex
DROP INDEX "Skin_primaryR_idx";

-- DropIndex
DROP INDEX "Skin_secondaryB_idx";

-- DropIndex
DROP INDEX "Skin_secondaryG_idx";

-- DropIndex
DROP INDEX "Skin_secondaryR_idx";

-- AlterTable
ALTER TABLE "Skin" DROP COLUMN "accentB",
DROP COLUMN "accentG",
DROP COLUMN "accentR",
DROP COLUMN "primaryB",
DROP COLUMN "primaryG",
DROP COLUMN "primaryR",
DROP COLUMN "secondaryB",
DROP COLUMN "secondaryG",
DROP COLUMN "secondaryR",
ADD COLUMN     "histBlack" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histBlue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histBrown" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histCyan" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histGray" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histGreen" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histOrange" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histPink" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histPurple" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histRed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histWhite" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "histYellow" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Skin_histRed_idx" ON "Skin"("histRed");

-- CreateIndex
CREATE INDEX "Skin_histOrange_idx" ON "Skin"("histOrange");

-- CreateIndex
CREATE INDEX "Skin_histYellow_idx" ON "Skin"("histYellow");

-- CreateIndex
CREATE INDEX "Skin_histGreen_idx" ON "Skin"("histGreen");

-- CreateIndex
CREATE INDEX "Skin_histCyan_idx" ON "Skin"("histCyan");

-- CreateIndex
CREATE INDEX "Skin_histBlue_idx" ON "Skin"("histBlue");

-- CreateIndex
CREATE INDEX "Skin_histPurple_idx" ON "Skin"("histPurple");

-- CreateIndex
CREATE INDEX "Skin_histPink_idx" ON "Skin"("histPink");

-- CreateIndex
CREATE INDEX "Skin_histBrown_idx" ON "Skin"("histBrown");

-- CreateIndex
CREATE INDEX "Skin_histBlack_idx" ON "Skin"("histBlack");

-- CreateIndex
CREATE INDEX "Skin_histGray_idx" ON "Skin"("histGray");

-- CreateIndex
CREATE INDEX "Skin_histWhite_idx" ON "Skin"("histWhite");
