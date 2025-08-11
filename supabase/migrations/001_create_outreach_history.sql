-- Create outreach history tables
CREATE TABLE IF NOT EXISTS public.cold_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  email_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.linkedin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  message_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cold_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cold emails" ON public.cold_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cold emails" ON public.cold_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own LinkedIn messages" ON public.linkedin_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LinkedIn messages" ON public.linkedin_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS cold_emails_user_id_created_at_idx ON public.cold_emails(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS linkedin_messages_user_id_created_at_idx ON public.linkedin_messages(user_id, created_at DESC);