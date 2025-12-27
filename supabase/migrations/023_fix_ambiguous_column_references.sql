-- Fix ambiguous column references in rate limiting functions
-- The error occurs when user_id and action_type are not properly qualified

-- Fix increment_rate_limit function
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_user_id UUID,
    p_action_type TEXT,
    p_window_minutes INTEGER DEFAULT 1440
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    action_type TEXT,
    count INTEGER,
    window_start TIMESTAMP WITH TIME ZONE,
    window_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_allowed BOOLEAN,
    remaining INTEGER
) AS $$
DECLARE
    window_start_time TIMESTAMP WITH TIME ZONE;
    window_end_time TIMESTAMP WITH TIME ZONE;
    current_count INTEGER;
    max_requests INTEGER;
    is_allowed BOOLEAN;
    remaining INTEGER;
BEGIN
    -- Calculate window start time (start of day in UTC)
    window_start_time := date_trunc('day', timezone('utc'::text, now()));
    window_end_time := window_start_time + (p_window_minutes || ' minutes')::interval;

    -- Get or create rate limit record
    PERFORM get_or_init_rate_limit(p_user_id, p_action_type, p_window_minutes);

    -- Get current count
    SELECT COALESCE(rl.count, 0) INTO current_count
    FROM rate_limits rl
    WHERE rl.user_id = p_user_id
      AND rl.action_type = p_action_type
      AND rl.window_start = window_start_time;

    -- Set max requests based on action type
    CASE p_action_type
        WHEN 'search' THEN max_requests := 15;
        WHEN 'email_regeneration' THEN max_requests := 5;
        WHEN 'linkedin_regeneration' THEN max_requests := 5;
        WHEN 'linkedin_rephrase' THEN max_requests := 5;
        ELSE max_requests := 0;
    END CASE;

    -- Check if allowed
    is_allowed := current_count < max_requests;
    remaining := GREATEST(0, max_requests - current_count);

    -- Only increment if allowed
    IF is_allowed THEN
        UPDATE rate_limits
        SET count = count + 1,
            updated_at = timezone('utc'::text, now())
        WHERE rate_limits.user_id = p_user_id
          AND rate_limits.action_type = p_action_type
          AND rate_limits.window_start = window_start_time;
    END IF;

    -- Return the updated record
    RETURN QUERY
    SELECT rl.id, rl.user_id, rl.action_type, rl.count, rl.window_start, window_end_time,
           rl.created_at, rl.updated_at, is_allowed, remaining
    FROM rate_limits rl
    WHERE rl.user_id = p_user_id
      AND rl.action_type = p_action_type
      AND rl.window_start = window_start_time;
END;
$$ language 'plpgsql';
