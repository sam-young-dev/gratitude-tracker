-- Row-level security: a second layer under the app's own userId scoping.
-- The app sets `app.user_id` per transaction (see src/server/journal.ts).
-- FORCE makes the policies apply to the table owner, which is the role the app
-- connects as. With no `app.user_id` set, current_setting(..., true) is NULL and
-- no rows match, so a forgotten scope returns nothing instead of everything.

ALTER TABLE "entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "entries_owner" ON "entries"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tags_owner" ON "tags"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint
-- entry_tags has no user_id: a row is visible only when both its entry and its
-- tag are (the subqueries are themselves filtered by the policies above).
ALTER TABLE "entry_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entry_tags" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "entry_tags_owner" ON "entry_tags"
  USING (
    EXISTS (SELECT 1 FROM "entries" e WHERE e."id" = "entry_id")
    AND EXISTS (SELECT 1 FROM "tags" t WHERE t."id" = "tag_id")
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "entries" e WHERE e."id" = "entry_id")
    AND EXISTS (SELECT 1 FROM "tags" t WHERE t."id" = "tag_id")
  );
