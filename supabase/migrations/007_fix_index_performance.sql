-- Fix database performance issues: add missing indexes and remove unused ones

-- The email_history and linkedin_history tables should already have user_id indexes
-- from the base schema, but let's ensure they exist with the proper names

-- Ensure proper indexes exist for foreign keys (these may already exist with different names)
CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON public.email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_history_user_id ON public.linkedin_history(user_id);

-- Remove unused indexes that are not being utilized
-- These indexes consume space and slow down writes without providing query benefits

-- Drop unused index on cold_emails
DROP INDEX IF EXISTS public.cold_emails_user_id_created_at_idx;

-- Drop unused index on linkedin_messages  
DROP INDEX IF EXISTS public.linkedin_messages_user_id_created_at_idx;

-- Drop unused indexes on contact_results
DROP INDEX IF EXISTS public.idx_contact_results_created_at;
DROP INDEX IF EXISTS public.idx_contact_results_source_metrics;

-- Note: We're keeping the more commonly used indexes:
-- - idx_contact_results_user_id (frequently used for user-specific queries)
-- - idx_contact_results_company (used for company searches)
-- - email_history_user_id_idx and linkedin_history_user_id_idx (from base schema)
-- These are likely being used and provide value for the application
