import { db } from './db'
import { emailHistory, linkedinHistory } from './schema'
import type { EmailHistory, LinkedinHistory } from './schema'
import { supabase } from './supabase'
import { eq, desc } from 'drizzle-orm'

export const saveEmailHistory = async (data: {
  company_name: string
  role: string
  subject_line: string
  content: string
}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await db.insert(emailHistory).values({
    userId: user.id,
    companyName: data.company_name,
    role: data.role,
    subjectLine: data.subject_line,
    content: data.content,
  }).returning()

  return result[0]
}

export const saveLinkedInHistory = async (data: {
  company_name: string
  role: string
  content: string
}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await db.insert(linkedinHistory).values({
    userId: user.id,
    companyName: data.company_name,
    role: data.role,
    content: data.content,
  }).returning()

  return result[0]
}

export const getEmailHistory = async (): Promise<EmailHistory[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await db
    .select()
    .from(emailHistory)
    .where(eq(emailHistory.userId, user.id))
    .orderBy(desc(emailHistory.createdAt))

  return result
}

export const getLinkedInHistory = async (): Promise<LinkedinHistory[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await db
    .select()
    .from(linkedinHistory)
    .where(eq(linkedinHistory.userId, user.id))
    .orderBy(desc(linkedinHistory.createdAt))

  return result
}