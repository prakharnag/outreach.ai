-- Clean up test data from all tables to free up Supabase free tier space
-- This will remove all data but preserve table structure and policies

-- Clean up contact_results table (likely the largest)
TRUNCATE TABLE public.contact_results RESTART IDENTITY CASCADE;

-- Clean up email history tables
TRUNCATE TABLE public.email_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.cold_emails RESTART IDENTITY CASCADE;

-- Clean up LinkedIn history tables  
TRUNCATE TABLE public.linkedin_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.linkedin_messages RESTART IDENTITY CASCADE;

-- Clean up any source metrics data if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'source_metrics') THEN
        TRUNCATE TABLE public.source_metrics RESTART IDENTITY CASCADE;
    END IF;
END $$;

-- Log cleanup completion
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed. All test data removed, table structures preserved.';
    RAISE NOTICE 'Note: Run VACUUM manually in the SQL editor to reclaim disk space.';
END $$;
