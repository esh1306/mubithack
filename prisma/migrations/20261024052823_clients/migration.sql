-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eori" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Line" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "value" REAL,
    "qty" REAL,
    "origin" TEXT,
    "neverSeen" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "externalRef" TEXT,
    "existingCode" TEXT,
    "clientId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Line_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Line_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Line" ("batchId", "brokerId", "createdAt", "existingCode", "externalRef", "id", "neverSeen", "origin", "qty", "source", "text", "value") SELECT "batchId", "brokerId", "createdAt", "existingCode", "externalRef", "id", "neverSeen", "origin", "qty", "source", "text", "value" FROM "Line";
DROP TABLE "Line";
ALTER TABLE "new_Line" RENAME TO "Line";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
