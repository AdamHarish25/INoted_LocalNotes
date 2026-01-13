-- 1. Ensure the 'images' bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload images" ON storage.objects;

-- 3. Create Permissive Policies (Fix for RLS Error)

-- ALLOW SELECT: Everyone can see images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'images' );

-- ALLOW INSERT: Authenticated AND Anon users (temporary fix for auth issues)
CREATE POLICY "Public can upload images"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'images' );

-- ALLOW UPDATE: Owners can update
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'images' AND owner = auth.uid() );
