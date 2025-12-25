-- ============================================
-- Créer le bucket Supabase Storage pour la musique
-- ============================================

-- Créer le bucket "music" s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Permettre l'accès public en lecture
CREATE POLICY "Public music access" ON storage.objects
  FOR SELECT USING (bucket_id = 'music');

-- Permettre aux administrateurs d'uploader
CREATE POLICY "Admin music upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'music');

-- Permettre aux administrateurs de supprimer
CREATE POLICY "Admin music delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'music');

-- Permettre aux administrateurs de mettre à jour
CREATE POLICY "Admin music update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'music');
