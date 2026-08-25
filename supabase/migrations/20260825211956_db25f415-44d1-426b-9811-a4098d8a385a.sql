REVOKE ALL ON FUNCTION public.recalc_story_status(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.story_frames_sync_status() FROM public, anon, authenticated;