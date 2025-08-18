-- Optimize RLS policies for better performance
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- Drop existing policies for email_history
DROP POLICY IF EXISTS "Users can view their own email history" ON public.email_history;
DROP POLICY IF EXISTS "Users can insert their own email history" ON public.email_history;

-- Drop existing policies for linkedin_history  
DROP POLICY IF EXISTS "Users can view their own linkedin history" ON public.linkedin_history;
DROP POLICY IF EXISTS "Users can insert their own linkedin history" ON public.linkedin_history;

-- Drop existing policies for cold_emails
DROP POLICY IF EXISTS "Users can view their own cold emails" ON public.cold_emails;
DROP POLICY IF EXISTS "Users can insert their own cold emails" ON public.cold_emails;

-- Drop existing policies for linkedin_messages
DROP POLICY IF EXISTS "Users can view their own LinkedIn messages" ON public.linkedin_messages;
DROP POLICY IF EXISTS "Users can insert their own LinkedIn messages" ON public.linkedin_messages;

-- Drop existing policies for contact_results
DROP POLICY IF EXISTS "Users can view their own contact results" ON public.contact_results;
DROP POLICY IF EXISTS "Users can insert their own contact results" ON public.contact_results;
DROP POLICY IF EXISTS "Users can update their own contact results" ON public.contact_results;
DROP POLICY IF EXISTS "Users can delete their own contact results" ON public.contact_results;

-- Create optimized policies for email_history
CREATE POLICY "Users can view their own email history" ON public.email_history
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own email history" ON public.email_history
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Create optimized policies for linkedin_history
CREATE POLICY "Users can view their own linkedin history" ON public.linkedin_history
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own linkedin history" ON public.linkedin_history
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Create optimized policies for cold_emails
CREATE POLICY "Users can view their own cold emails" ON public.cold_emails
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own cold emails" ON public.cold_emails
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Create optimized policies for linkedin_messages
CREATE POLICY "Users can view their own LinkedIn messages" ON public.linkedin_messages
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own LinkedIn messages" ON public.linkedin_messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Create optimized policies for contact_results
CREATE POLICY "Users can view their own contact results" ON public.contact_results
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own contact results" ON public.contact_results
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own contact results" ON public.contact_results
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own contact results" ON public.contact_results
  FOR DELETE USING ((select auth.uid()) = user_id);
