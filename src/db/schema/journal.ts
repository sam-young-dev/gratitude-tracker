import { relations } from 'drizzle-orm'
import {
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

// A "moment". entry_date is a calendar day (no time zone), so a late-night entry
// can't slip to the wrong day. created_at orders entries within a day.
export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    scripture: text('scripture'),
    outcome: text('outcome'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('entries_user_date_idx').on(table.userId, table.entryDate)],
)

// name keeps the casing the person first used; name_key is lower-cased so tags
// are unique per user regardless of case.
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameKey: text('name_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique('tags_user_name_key').on(table.userId, table.nameKey)],
)

export const entryTags = pgTable(
  'entry_tags',
  {
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.tagId] }),
    index('entry_tags_tag_idx').on(table.tagId),
  ],
)

export const entriesRelations = relations(entries, ({ many }) => ({
  entryTags: many(entryTags),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags),
}))

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id],
  }),
  tag: one(tags, { fields: [entryTags.tagId], references: [tags.id] }),
}))
