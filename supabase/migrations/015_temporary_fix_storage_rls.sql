-- Temporarily disable RLS on storage.objects to test upload
-- This is for development only - re-enable with proper policies later
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Re-enable with simplified policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simple policies for testing
CREATE POLICY "Allow authenticated users to upload resumes" ON storage.objects 
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to view resumes" ON storage.objects 
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to update resumes" ON storage.objects 
    FOR UPDATE USING (
        bucket_id = 'resumes' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to delete resumes" ON storage.objects 
    FOR DELETE USING (
        bucket_id = 'resumes' AND 
        auth.role() = 'authenticated'
    );
