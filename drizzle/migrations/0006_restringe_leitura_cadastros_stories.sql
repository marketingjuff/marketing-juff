ALTER POLICY "ctas_select" ON public.story_ctas USING (public.has_permission('social.stories'));
ALTER POLICY "story_links_select" ON public.story_links USING (public.has_permission('social.stories'));
ALTER POLICY "objectives_select" ON public.story_objectives USING (public.has_permission('social.stories'));
ALTER POLICY "presets leitura autenticada" ON public.story_text_presets USING (public.has_permission('social.stories'));
ALTER POLICY "logos leitura autenticada" ON public.story_logos USING (public.has_permission('social.stories'));
ALTER POLICY "logos bucket leitura" ON storage.objects USING (bucket_id = 'logos' AND public.has_permission('social.stories'));