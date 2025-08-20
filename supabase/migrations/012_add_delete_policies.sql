-- Add delete policies for email_history and linkedin_history tables
-- This migration adds the missing DELETE policies that were not previously applied

-- Create delete policy for email_history (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'email_history' 
        AND policyname = 'Users can delete their own email history'
    ) THEN
        CREATE POLICY "Users can delete their own email history" ON email_history
        FOR DELETE USING ((select auth.uid()) = user_id);
    END IF;
END $$;

-- Create delete policy for linkedin_history (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'linkedin_history' 
        AND policyname = 'Users can delete their own linkedin history'
    ) THEN
        CREATE POLICY "Users can delete their own linkedin history" ON linkedin_history
        FOR DELETE USING ((select auth.uid()) = user_id);
    END IF;
END $$;
