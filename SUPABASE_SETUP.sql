-- 1. Ensure the 'images' bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']) -- 10MB limit
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. Drop existing policies to clean up conflicts
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 3. Create explicit policies

-- ALLOW INSERT: Authenticated users can upload to 'images' bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'images' );

-- ALLOW SELECT: Everyone (Public) can view files in 'images' bucket
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'images' );

-- ALLOW UPDATE: Owners can update their files
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'images' AND owner = auth.uid() );

-- ALLOW DELETE: Owners can delete their files
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'images' AND owner = auth.uid() );
