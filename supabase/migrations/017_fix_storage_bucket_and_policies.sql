-- Create the resumes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'resumes', 
    'resumes', 
    false, 
    5242880, -- 5MB limit
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete resumes" ON storage.objects;

-- Create RLS policies for folder structure (userId/filename.ext)
CREATE POLICY "Users can upload own resumes" ON storage.objects 
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own resumes" ON storage.objects 
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own resumes" ON storage.objects 
    FOR UPDATE USING (
        bucket_id = 'resumes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own resumes" ON storage.objects 
    FOR DELETE USING (
        bucket_id = 'resumes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
