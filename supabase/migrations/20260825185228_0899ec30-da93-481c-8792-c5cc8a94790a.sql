CREATE POLICY "stories_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stories' AND public.has_permission(auth.uid(), 'social.stories'));

CREATE POLICY "stories_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND public.can_edit(auth.uid(), 'social.stories'));

CREATE POLICY "stories_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND public.can_edit(auth.uid(), 'social.stories'));