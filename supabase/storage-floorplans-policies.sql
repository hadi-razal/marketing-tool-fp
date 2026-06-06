-- Run in Supabase Dashboard → SQL Editor
-- Fixes: "new row violates row-level security policy" on floorplan upload
--
-- Prerequisite: Storage bucket named "floorplans" exists (Storage → Buckets).
-- Set bucket to Public if you use getPublicUrl() without signed URLs.

-- Allow signed-in users to upload files
CREATE POLICY "floorplans: authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'floorplans');

-- Allow signed-in users to read (private bucket)
CREATE POLICY "floorplans: authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'floorplans');

-- Public read (required for public URLs; skip if you use signed URLs only)
CREATE POLICY "floorplans: public select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'floorplans');

-- Allow signed-in users to delete their uploads
CREATE POLICY "floorplans: authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'floorplans');

-- Optional: allow overwrite on re-upload
CREATE POLICY "floorplans: authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'floorplans')
WITH CHECK (bucket_id = 'floorplans');
