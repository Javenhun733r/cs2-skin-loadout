-- CreateTable
CREATE TABLE "Skin" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "weapon" TEXT,
    "rarity" TEXT,
    "type" TEXT NOT NULL,
    "primaryColorHex" VARCHAR(7) NOT NULL,

    CONSTRAINT "Skin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skin_id_key" ON "Skin"("id");
