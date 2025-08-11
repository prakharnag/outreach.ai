import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const emailHistory = pgTable('email_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  companyName: text('company_name').notNull(),
  role: text('role').notNull(),
  subjectLine: text('subject_line').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const linkedinHistory = pgTable('linkedin_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  companyName: text('company_name').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type EmailHistory = typeof emailHistory.$inferSelect
export type LinkedinHistory = typeof linkedinHistory.$inferSelect