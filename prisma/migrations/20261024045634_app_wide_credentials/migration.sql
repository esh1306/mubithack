-- One saved sign-in per outside system for the whole app (was one per broker).
CREATE TABLE "Credential" (
    "kind" TEXT NOT NULL PRIMARY KEY,
    "config" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- Keep what was already saved; if several brokers had one, keep the newest.
INSERT OR IGNORE INTO "Credential" ("kind", "config", "updatedAt")
SELECT "kind", "config", "updatedAt" FROM "Integration" ORDER BY "updatedAt" DESC;

DROP TABLE "Integration";
