-- Clean up all data from tables (second cleanup)
-- This will remove all test data to start fresh

-- Disable triggers temporarily to avoid conflicts
SET session_replication_role = replica;

-- Clean up all data from tables
TRUNCATE TABLE contact_results RESTART IDENTITY CASCADE;
TRUNCATE TABLE email_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE linkedin_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE source_metrics RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify cleanup
DO $$
DECLARE
    contact_count INTEGER;
    email_count INTEGER;
    linkedin_count INTEGER;
    source_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contact_count FROM contact_results;
    SELECT COUNT(*) INTO email_count FROM email_history;
    SELECT COUNT(*) INTO linkedin_count FROM linkedin_history;
    SELECT COUNT(*) INTO source_count FROM source_metrics;
    
    RAISE NOTICE 'Data cleanup completed:';
    RAISE NOTICE 'Contact results: % rows', contact_count;
    RAISE NOTICE 'Email history: % rows', email_count;
    RAISE NOTICE 'LinkedIn history: % rows', linkedin_count;
    RAISE NOTICE 'Source metrics: % rows', source_count;
END $$;
