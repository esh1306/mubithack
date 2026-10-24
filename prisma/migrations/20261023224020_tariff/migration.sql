/*
  Warnings:

  - You are about to drop the column `declarable` on the `Tariff` table. All the data in the column will be lost.
  - You are about to drop the column `raw` on the `Tariff` table. All the data in the column will be lost.
  - Added the required column `chapter` to the `Tariff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `heading` to the `Tariff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Tariff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "notes" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tariff" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "dutyRate" TEXT
);
INSERT INTO "new_Tariff" ("code", "description", "dutyRate") SELECT "code", "description", "dutyRate" FROM "Tariff";
DROP TABLE "Tariff";
ALTER TABLE "new_Tariff" RENAME TO "Tariff";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
