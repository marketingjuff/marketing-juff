DROP POLICY IF EXISTS "biblioteca_produtos_select" ON public.biblioteca_produtos;
CREATE POLICY "biblioteca_produtos_select" ON public.biblioteca_produtos FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.produtos') OR public.has_permission('biblioteca.catalogo_estampas') OR public.has_permission('biblioteca.estampa') OR public.has_permission('social.seeding'));
DROP POLICY IF EXISTS "biblioteca_produto_cores_select" ON public.biblioteca_produto_cores;
CREATE POLICY "biblioteca_produto_cores_select" ON public.biblioteca_produto_cores FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.produtos') OR public.has_permission('biblioteca.catalogo_estampas') OR public.has_permission('biblioteca.estampa') OR public.has_permission('social.seeding'));
DROP POLICY IF EXISTS "biblioteca_cores_select" ON public.biblioteca_cores;
CREATE POLICY "biblioteca_cores_select" ON public.biblioteca_cores FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.produtos') OR public.has_permission('biblioteca.catalogo_estampas') OR public.has_permission('biblioteca.estampa') OR public.has_permission('social.seeding'));
DROP POLICY IF EXISTS "biblioteca_medidas_select" ON public.biblioteca_medidas;
CREATE POLICY "biblioteca_medidas_select" ON public.biblioteca_medidas FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.produtos') OR public.has_permission('biblioteca.catalogo_estampas') OR public.has_permission('biblioteca.estampa') OR public.has_permission('social.seeding'));
DROP POLICY IF EXISTS biblioteca_tamanhos_olist_select ON public.biblioteca_tamanhos_olist;
CREATE POLICY biblioteca_tamanhos_olist_select ON public.biblioteca_tamanhos_olist FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.produtos') OR public.has_permission('biblioteca.catalogo_estampas') OR public.has_permission('biblioteca.estampa') OR public.has_permission('social.seeding'));
DROP POLICY IF EXISTS "biblioteca_textos_select" ON public.biblioteca_textos;
CREATE POLICY "biblioteca_textos_select" ON public.biblioteca_textos FOR SELECT TO authenticated
  USING (public.has_permission('biblioteca.marca'));
DROP POLICY IF EXISTS estrategia_email_tipos_select ON public.estrategia_email_tipos;
CREATE POLICY estrategia_email_tipos_select ON public.estrategia_email_tipos FOR SELECT TO authenticated
  USING (public.has_permission('estrategia.emails') OR public.has_permission('estrategia.ata'));
DROP POLICY IF EXISTS estrategia_email_regras_select ON public.estrategia_email_regras;
CREATE POLICY estrategia_email_regras_select ON public.estrategia_email_regras FOR SELECT TO authenticated
  USING (public.has_permission('estrategia.emails') OR public.has_permission('estrategia.ata'));
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());