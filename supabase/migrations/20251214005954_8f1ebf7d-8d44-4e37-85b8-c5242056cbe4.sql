-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for documents bucket

-- Admin/Staff can view all documents
CREATE POLICY "Admin/Staff can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND is_admin_or_staff(auth.uid())
);

-- Admin/Staff can upload documents for anyone
CREATE POLICY "Admin/Staff can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND is_admin_or_staff(auth.uid())
);

-- Admin/Staff can delete documents
CREATE POLICY "Admin/Staff can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND is_admin_or_staff(auth.uid())
);

-- Drivers can view their own documents
CREATE POLICY "Drivers can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'driver'
  AND EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.user_id = auth.uid() 
    AND drivers.id::text = (storage.foldername(name))[2]
  )
);

-- Drivers can upload their own documents
CREATE POLICY "Drivers can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'driver'
  AND EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.user_id = auth.uid() 
    AND drivers.id::text = (storage.foldername(name))[2]
  )
);

-- Fleets can view their own documents
CREATE POLICY "Fleets can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'fleet'
  AND EXISTS (
    SELECT 1 FROM fleets 
    WHERE fleets.user_id = auth.uid() 
    AND fleets.id::text = (storage.foldername(name))[2]
  )
);

-- Fleets can upload their own documents
CREATE POLICY "Fleets can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'fleet'
  AND EXISTS (
    SELECT 1 FROM fleets 
    WHERE fleets.user_id = auth.uid() 
    AND fleets.id::text = (storage.foldername(name))[2]
  )
);