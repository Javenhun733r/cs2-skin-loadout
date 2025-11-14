/*
  Warnings:

  - You are about to drop the column `histBlack` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histBlue` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histBrown` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histCyan` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histGray` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histGreen` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histOrange` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histPink` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histPurple` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histRed` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histWhite` on the `Skin` table. All the data in the column will be lost.
  - You are about to drop the column `histYellow` on the `Skin` table. All the data in the column will be lost.
  - Added the required column `histogram` to the `Skin` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Skin_histBlack_idx";

-- DropIndex
DROP INDEX "Skin_histBlue_idx";

-- DropIndex
DROP INDEX "Skin_histBrown_idx";

-- DropIndex
DROP INDEX "Skin_histCyan_idx";

-- DropIndex
DROP INDEX "Skin_histGray_idx";

-- DropIndex
DROP INDEX "Skin_histGreen_idx";

-- DropIndex
DROP INDEX "Skin_histOrange_idx";

-- DropIndex
DROP INDEX "Skin_histPink_idx";

-- DropIndex
DROP INDEX "Skin_histPurple_idx";

-- DropIndex
DROP INDEX "Skin_histRed_idx";

-- DropIndex
DROP INDEX "Skin_histWhite_idx";
CREATE EXTENSION IF NOT EXISTS vector;

-- DropIndex
DROP INDEX "Skin_histYellow_idx";
-- AlterTable
ALTER TABLE "Skin" DROP COLUMN "histBlack",

DROP COLUMN "histBlue",
DROP COLUMN "histBrown",
DROP COLUMN "histCyan",
DROP COLUMN "histGray",
DROP COLUMN "histGreen",
DROP COLUMN "histOrange",
DROP COLUMN "histPink",
DROP COLUMN "histPurple",
DROP COLUMN "histRed",
DROP COLUMN "histWhite",
DROP COLUMN "histYellow",
ADD COLUMN     "histogram" vector(64) NOT NULL;
