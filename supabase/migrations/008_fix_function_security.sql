-- Fix function search path security vulnerabilities
-- Add SECURITY DEFINER and SET search_path to prevent SQL injection via search_path manipulation

-- Drop the trigger first before dropping the function
DROP TRIGGER IF EXISTS update_contact_results_updated_at ON public.contact_results;

-- Drop and recreate update_updated_at_column with secure search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_contact_results_updated_at 
  BEFORE UPDATE ON public.contact_results 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop and recreate insert_contact_result with secure search_path
DROP FUNCTION IF EXISTS public.insert_contact_result(UUID, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.insert_contact_result(
  p_user_id UUID,
  p_company_name TEXT,
  p_research_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
  existing_record RECORD;
BEGIN
  -- Check if a record already exists for this user and company (case-insensitive)
  SELECT id, created_at INTO existing_record 
  FROM contact_results 
  WHERE user_id = p_user_id AND LOWER(company_name) = LOWER(p_company_name)
  ORDER BY updated_at DESC 
  LIMIT 1;
  
  IF existing_record.id IS NOT NULL THEN
    -- Update existing record with new research data and updated timestamp
    UPDATE contact_results 
    SET 
      research_data = p_research_data,
      updated_at = NOW(),
      company_name = p_company_name -- Standardize the company name
    WHERE id = existing_record.id
    RETURNING id INTO result_id;
    
    -- Log that we updated an existing record
    RAISE NOTICE 'Updated existing contact result for company % (id: %)', p_company_name, result_id;
  ELSE
    -- Insert new contact result
    INSERT INTO contact_results (
      user_id,
      company_name,
      research_data,
      created_at
    ) VALUES (
      p_user_id,
      p_company_name,
      p_research_data,
      NOW()
    ) RETURNING id INTO result_id;
    
    -- Log that we created a new record
    RAISE NOTICE 'Created new contact result for company % (id: %)', p_company_name, result_id;
  END IF;
  
  RETURN result_id;
END;
$$;

-- Drop and recreate cleanup_duplicate_contacts with secure search_path
DROP FUNCTION IF EXISTS public.cleanup_duplicate_contacts();
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_contacts()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup_record RECORD;
  keep_id UUID;
  delete_count INTEGER := 0;
  current_deletes INTEGER;
BEGIN
  -- For each user and company combination that has duplicates
  FOR dup_record IN 
    SELECT user_id, LOWER(company_name) as normalized_name, COUNT(*) as cnt
    FROM contact_results 
    GROUP BY user_id, LOWER(company_name) 
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recently updated record
    SELECT id INTO keep_id
    FROM contact_results 
    WHERE user_id = dup_record.user_id 
      AND LOWER(company_name) = dup_record.normalized_name
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1;
    
    -- Delete the older duplicates
    DELETE FROM contact_results 
    WHERE user_id = dup_record.user_id 
      AND LOWER(company_name) = dup_record.normalized_name
      AND id != keep_id;
    
    GET DIAGNOSTICS current_deletes = ROW_COUNT;
    delete_count := delete_count + current_deletes;
  END LOOP;
  
  RETURN 'Cleaned up ' || delete_count || ' duplicate records';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_contact_result(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_contact_result(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_contacts() TO service_role;

-- Note: Leaked password protection must be enabled in Supabase Dashboard
-- Go to Project Settings > Authentication > Password Protection
-- Enable "Prevent sign ups with leaked passwords"
