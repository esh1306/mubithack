-- AlterTable
ALTER TABLE "Precedent" ADD COLUMN "variantCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Precedent" ADD COLUMN "variantsMatched" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Precedent" ADD COLUMN "variantRequestIds" TEXT;

-- AlterTable
ALTER TABLE "RetroFinding" ADD COLUMN "maths" TEXT;
