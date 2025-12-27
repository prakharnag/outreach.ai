-- Add resume_original_filename column to store the original filename for display
-- This allows us to store the file path for storage access while preserving the original filename

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS resume_original_filename TEXT;

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.resume_original_filename IS 'Original filename of the uploaded resume file for display purposes';

-- Update existing records to use resume_filename as original filename if resume_original_filename is null
UPDATE user_profiles 
SET resume_original_filename = CASE 
  WHEN resume_filename IS NOT NULL AND resume_filename LIKE '%/%' THEN 
    split_part(resume_filename, '/', array_length(string_to_array(resume_filename, '/'), 1))
  ELSE resume_filename
END
WHERE resume_original_filename IS NULL AND resume_filename IS NOT NULL;
