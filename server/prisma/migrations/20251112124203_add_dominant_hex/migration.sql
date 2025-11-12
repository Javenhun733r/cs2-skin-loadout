-- AlterTable
ALTER TABLE "Skin" ADD COLUMN     "dominantHex" TEXT NOT NULL DEFAULT '#808080';

-- CreateIndex
CREATE INDEX "Skin_dominantHex_idx" ON "Skin"("dominantHex");
