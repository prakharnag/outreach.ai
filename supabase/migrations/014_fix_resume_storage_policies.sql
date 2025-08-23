-- Drop existing storage policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;

-- Create simplified storage policies that work with our file naming pattern
-- Files are named as: userId_timestamp.ext
CREATE POLICY "Users can upload own resumes" ON storage.objects 
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        auth.uid()::text = split_part(name, '_', 1)
    );

CREATE POLICY "Users can view own resumes" ON storage.objects 
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = split_part(name, '_', 1)
    );

CREATE POLICY "Users can update own resumes" ON storage.objects 
    FOR UPDATE USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = split_part(name, '_', 1)
    );

CREATE POLICY "Users can delete own resumes" ON storage.objects 
    FOR DELETE USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = split_part(name, '_', 1)
    );
