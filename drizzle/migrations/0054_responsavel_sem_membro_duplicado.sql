CREATE OR REPLACE FUNCTION public.tarefa_membro_nao_responsavel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE responsavel uuid;
BEGIN
  SELECT responsavel_id INTO responsavel FROM public.tarefa_cards WHERE id = NEW.card_id FOR UPDATE;
  IF NEW.user_id = responsavel THEN RETURN NULL; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tarefa_membro_nao_responsavel() FROM PUBLIC;
CREATE TRIGGER trg_membro_nao_responsavel BEFORE INSERT OR UPDATE ON public.tarefa_card_membros FOR EACH ROW EXECUTE FUNCTION public.tarefa_membro_nao_responsavel();
CREATE OR REPLACE FUNCTION public.tarefa_remover_responsavel_dos_membros()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.tarefa_card_membros WHERE card_id = NEW.id AND user_id = NEW.responsavel_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tarefa_remover_responsavel_dos_membros() FROM PUBLIC;
CREATE TRIGGER trg_responsavel_sem_membro AFTER INSERT OR UPDATE ON public.tarefa_cards FOR EACH ROW EXECUTE FUNCTION public.tarefa_remover_responsavel_dos_membros();