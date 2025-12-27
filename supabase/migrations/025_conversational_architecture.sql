-- Migration 025: Conversational AI Job Search Architecture
-- Creates tables for conversations, messages, ICP profiles, and job tracking
-- Author: AI Assistant
-- Date: 2025-12-26

-- ============================================================================
-- 1. CONVERSATIONS TABLE
-- ============================================================================
-- Tracks chat sessions between users and the AI assistant
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups, sorted by most recent
CREATE INDEX idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. MESSAGES TABLE
-- ============================================================================
-- Stores conversation message history (user and assistant messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- For storing intent, function calls, attachments, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_messages_conversation
  ON messages(conversation_id, created_at ASC);

CREATE INDEX idx_messages_user
  ON messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE/DELETE policies - messages are immutable once created

-- ============================================================================
-- 3. ICP PROFILES TABLE
-- ============================================================================
-- Stores user's Ideal Customer Profile (target company criteria)
CREATE TABLE IF NOT EXISTS icp_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- ICP criteria (arrays for multi-select)
  target_roles TEXT[], -- e.g., ["ML Engineer", "Senior Software Engineer"]
  industries TEXT[], -- e.g., ["AI/ML", "FinTech", "HealthTech"]
  company_sizes TEXT[], -- e.g., ["Seed", "Series A", "Series B", "Growth"]
  locations TEXT[], -- e.g., ["San Francisco", "Remote", "New York"]
  tech_stack TEXT[], -- e.g., ["Python", "TensorFlow", "AWS", "Kubernetes"]

  -- Flexible storage for additional criteria
  additional_criteria JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_icp_user
  ON icp_profiles(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (full CRUD for users on their own ICPs)
CREATE POLICY "Users can manage own ICP"
  ON icp_profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_icp_profiles_updated_at
  BEFORE UPDATE ON icp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. JOB SEARCHES TABLE
-- ============================================================================
-- Stores discovered/tracked jobs from searches
CREATE TABLE IF NOT EXISTS job_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Company & role information
  company_name TEXT NOT NULL,
  company_domain TEXT,
  role TEXT NOT NULL,

  -- Research data (reuses existing structure from contact_results)
  research_data JSONB,

  -- Status tracking
  status TEXT DEFAULT 'discovered' CHECK (
    status IN ('discovered', 'researched', 'applied', 'interviewing', 'rejected', 'accepted')
  ),

  -- Optional: Link to generated messages
  email_message_id UUID REFERENCES cold_emails(id) ON DELETE SET NULL,
  linkedin_message_id UUID REFERENCES linkedin_messages(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_searches_user
  ON job_searches(user_id, created_at DESC);

CREATE INDEX idx_job_searches_status
  ON job_searches(user_id, status);

CREATE INDEX idx_job_searches_conversation
  ON job_searches(conversation_id);

-- Enable RLS
ALTER TABLE job_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own job searches"
  ON job_searches
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_job_searches_updated_at
  BEFORE UPDATE ON job_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. EMAIL CAMPAIGNS TABLE
-- ============================================================================
-- Tracks automated emails sent by the agent
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  job_search_id UUID REFERENCES job_searches(id) ON DELETE SET NULL,

  -- Email details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  company_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'drafted' CHECK (
    status IN ('drafted', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')
  ),

  -- Metadata
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id, created_at DESC);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(user_id, status);
CREATE INDEX idx_email_campaigns_job ON email_campaigns(job_search_id);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email campaigns"
  ON email_campaigns FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. LINKEDIN DRAFTS TABLE
-- ============================================================================
-- Stores LinkedIn message drafts awaiting user approval
CREATE TABLE IF NOT EXISTS linkedin_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  job_search_id UUID REFERENCES job_searches(id) ON DELETE SET NULL,

  -- LinkedIn details
  recipient_name TEXT NOT NULL,
  recipient_profile_url TEXT,
  company_name TEXT,
  message TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'sent', 'rejected', 'expired')
  ),

  -- Metadata
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_linkedin_drafts_user ON linkedin_drafts(user_id, created_at DESC);
CREATE INDEX idx_linkedin_drafts_status ON linkedin_drafts(user_id, status);
CREATE INDEX idx_linkedin_drafts_job ON linkedin_drafts(job_search_id);

ALTER TABLE linkedin_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own LinkedIn drafts"
  ON linkedin_drafts FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_linkedin_drafts_updated_at
  BEFORE UPDATE ON linkedin_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. APPLICATION FORMS TABLE
-- ============================================================================
-- Stores pre-filled application form data for user review
CREATE TABLE IF NOT EXISTS application_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  job_search_id UUID REFERENCES job_searches(id) ON DELETE SET NULL,

  -- Application details
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  application_url TEXT NOT NULL,

  -- Pre-filled form data
  form_data JSONB NOT NULL DEFAULT '{}', -- { field_name: value, ... }
  detected_fields JSONB DEFAULT '{}', -- { field_type: selector, ... }

  -- Status tracking
  status TEXT DEFAULT 'drafted' CHECK (
    status IN ('drafted', 'reviewed', 'submitted', 'rejected', 'expired')
  ),

  -- Metadata
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_application_forms_user ON application_forms(user_id, created_at DESC);
CREATE INDEX idx_application_forms_status ON application_forms(user_id, status);
CREATE INDEX idx_application_forms_job ON application_forms(job_search_id);

ALTER TABLE application_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own application forms"
  ON application_forms FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_application_forms_updated_at
  BEFORE UPDATE ON application_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get conversation with message count
CREATE OR REPLACE FUNCTION get_conversation_with_count(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  message_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.title,
    COUNT(m.id) as message_count,
    c.created_at,
    c.updated_at
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.id = p_conversation_id
  GROUP BY c.id;
END;
$$;

-- Function to auto-generate conversation title from first user message
CREATE OR REPLACE FUNCTION auto_generate_conversation_title()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_title TEXT;
  v_conversation conversations%ROWTYPE;
BEGIN
  -- Only process user messages
  IF NEW.role != 'user' THEN
    RETURN NEW;
  END IF;

  -- Get the conversation
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Only generate title if conversation has no title
  IF v_conversation.title IS NULL THEN
    -- Use first 50 chars of message as title
    v_title := LEFT(NEW.content, 50);
    IF LENGTH(NEW.content) > 50 THEN
      v_title := v_title || '...';
    END IF;

    -- Update conversation title
    UPDATE conversations
    SET title = v_title
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-generate conversation title
CREATE TRIGGER auto_title_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_conversation_title();

-- ============================================================================
-- 9. GRANTS (if needed for service role)
-- ============================================================================

-- Grant service role access for server-side operations
GRANT ALL ON conversations TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON icp_profiles TO service_role;
GRANT ALL ON job_searches TO service_role;
GRANT ALL ON email_campaigns TO service_role;
GRANT ALL ON linkedin_drafts TO service_role;
GRANT ALL ON application_forms TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comments for tracking
COMMENT ON TABLE conversations IS 'Conversational AI chat sessions (Migration 025)';
COMMENT ON TABLE messages IS 'Message history for conversations (Migration 025)';
COMMENT ON TABLE icp_profiles IS 'User ideal customer profiles for job search (Migration 025)';
COMMENT ON TABLE job_searches IS 'Discovered and tracked job opportunities (Migration 025)';
COMMENT ON TABLE email_campaigns IS 'Automated email outreach campaigns (Migration 025)';
COMMENT ON TABLE linkedin_drafts IS 'LinkedIn message drafts awaiting approval (Migration 025)';
COMMENT ON TABLE application_forms IS 'Pre-filled job application forms for review (Migration 025)';
