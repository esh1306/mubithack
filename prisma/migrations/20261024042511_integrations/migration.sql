-- AlterTable
ALTER TABLE "Line" ADD COLUMN "existingCode" TEXT;
ALTER TABLE "Line" ADD COLUMN "externalRef" TEXT;
ALTER TABLE "Line" ADD COLUMN "source" TEXT;

-- CreateTable
CREATE TABLE "Integration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_brokerId_kind_key" ON "Integration"("brokerId", "kind");
