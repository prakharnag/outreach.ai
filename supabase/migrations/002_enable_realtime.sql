-- Enable real-time for email_history table
ALTER PUBLICATION supabase_realtime ADD TABLE email_history;

-- Enable real-time for linkedin_history table  
ALTER PUBLICATION supabase_realtime ADD TABLE linkedin_history;

-- Grant necessary permissions for real-time
GRANT SELECT ON email_history TO anon, authenticated;
GRANT SELECT ON linkedin_history TO anon, authenticated;