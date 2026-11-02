-- Full-text search over a moment's own text. The query in src/server/journal.ts
-- must use this exact expression for Postgres to use the index.
CREATE INDEX "entries_search_idx" ON "entries" USING gin (
  to_tsvector('english',
    "title" || ' ' || "body" || ' ' || coalesce("scripture", '') || ' ' || coalesce("outcome", ''))
);
