-- Create contact_results table for storing research and verification agent outputs
CREATE TABLE IF NOT EXISTS contact_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  email_inferred BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2),
  source_url TEXT,
  source_title TEXT,
  research_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_results_user_id ON contact_results(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_results_company ON contact_results(company_name);
CREATE INDEX IF NOT EXISTS idx_contact_results_created_at ON contact_results(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE contact_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own contact results" ON contact_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact results" ON contact_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact results" ON contact_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact results" ON contact_results
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for contact_results
ALTER PUBLICATION supabase_realtime ADD TABLE contact_results;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_contact_results_updated_at 
  BEFORE UPDATE ON contact_results 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();