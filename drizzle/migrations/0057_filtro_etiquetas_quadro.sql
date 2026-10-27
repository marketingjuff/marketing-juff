alter table public.tarefa_quadros
  add column if not exists filtro_etiquetas boolean not null default false;

comment on column public.tarefa_quadros.filtro_etiquetas is
  'Quando verdadeiro, o quadro mostra a barra de etiquetas em pilulas no lugar do seletor suspenso, e oferece etiquetas no formulario de criar card. Desligado por padrao.';