-- Create email_history table
CREATE TABLE IF NOT EXISTS email_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create linkedin_history table
CREATE TABLE IF NOT EXISTS linkedin_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_history ENABLE ROW LEVEL SECURITY;

-- Create policies for email_history
CREATE POLICY "Users can view their own email history" ON email_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email history" ON email_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for linkedin_history
CREATE POLICY "Users can view their own linkedin history" ON linkedin_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linkedin history" ON linkedin_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS email_history_user_id_idx ON email_history(user_id);
CREATE INDEX IF NOT EXISTS email_history_created_at_idx ON email_history(created_at DESC);
CREATE INDEX IF NOT EXISTS linkedin_history_user_id_idx ON linkedin_history(user_id);
CREATE INDEX IF NOT EXISTS linkedin_history_created_at_idx ON linkedin_history(created_at DESC);