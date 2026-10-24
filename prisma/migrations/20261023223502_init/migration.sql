-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Line" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "value" REAL,
    "qty" REAL,
    "origin" TEXT,
    "neverSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Line_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lineId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "flagged" BOOLEAN NOT NULL,
    "question" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "precedentId" INTEGER,
    "mubitRequestId" TEXT,
    "model" TEXT NOT NULL,
    "toolCalls" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Suggestion_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Precedent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "lineText" TEXT NOT NULL,
    "oldCode" TEXT NOT NULL,
    "newCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Precedent_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tariff" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "dutyRate" TEXT,
    "declarable" BOOLEAN NOT NULL DEFAULT true,
    "raw" TEXT
);

-- CreateTable
CREATE TABLE "PastEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brokerId" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "declaredCode" TEXT NOT NULL,
    "customsValue" REAL NOT NULL,
    "dutyPaid" REAL NOT NULL,
    CONSTRAINT "PastEntry_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetroFinding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pastEntryId" INTEGER NOT NULL,
    "suggestedCode" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "dutyDelta" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetroFinding_pastEntryId_fkey" FOREIGN KEY ("pastEntryId") REFERENCES "PastEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
