-- Create RPC function to insert contact results with proper user context
CREATE OR REPLACE FUNCTION insert_contact_result(
  p_user_id UUID,
  p_company_name TEXT,
  p_research_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Insert the contact result
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
  
  RETURN result_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_contact_result(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_contact_result(UUID, TEXT, JSONB) TO service_role;
