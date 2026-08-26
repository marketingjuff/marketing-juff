import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Pencil, Plus, Target, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { profileQueryOptions } from "@/lib/auth";
import {
  createObjective,
  deleteObjective,
  objectivesQueryOptions,
  updateObjective,
  type Objective,
} from "@/lib/objectives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos de story — Marketing Juff" },
      {
        name: "description",
        content:
          "Cadastre e mantenha os objetivos usados nos stories da Juff, com nome e instrução completa.",
      },
      { property: "og:title", content: "Objetivos de story — Marketing Juff" },
      {
        property: "og:description",
        content: "Cadastro de objetivos de story do Marketing Juff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ObjetivosPage,
});

function ObjetivosPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const podeGerenciar = profile?.role === "admin" || profile?.role === "gestor";
  const queryClient = useQueryClient();

  const { data: objetivos = [], isLoading } = useQuery({
    ...objectivesQueryOptions,
    enabled: podeGerenciar,
  });

  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [editando, setEditando] = useState<Objective | "novo" | null>(null);
  const [nome, setNome] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const [excluindo, setExcluindo] = useState<Objective | null>(null);
  const [confirmacao, setConfirmacao] = useState("");

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["story-objectives"] });
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (editando === "novo") await createObjective(nome, instrucao);
      else if (editando) await updateObjective(editando.id, { nome: nome.trim(), instrucao });
    },
    onSuccess: async () => {
      await invalidar();
      setEditando(null);
      toast.success("Objetivo salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o objetivo."),
  });

  const arquivar = useMutation({
    mutationFn: (o: Objective) => updateObjective(o.id, { arquivado: !o.arquivado }),
    onSuccess: async (_d, o) => {
      await invalidar();
      toast.success(o.arquivado ? "Objetivo reativado." : "Objetivo arquivado.");
    },
    onError: () => toast.error("Não foi possível alterar o objetivo."),
  });

  const excluir = useMutation({
    mutationFn: (o: Objective) => deleteObjective(o.id),
    onSuccess: async () => {
      await invalidar();
      setExcluindo(null);
      setConfirmacao("");
      toast.success("Objetivo excluído.");
    },
    onError: () => toast.error("Não foi possível excluir o objetivo."),
  });

  if (!podeGerenciar) {
    return (
      <AppShell>
        <h1 className="text-lg font-semibold">Objetivos de story</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta tela é restrita a administradores e gestores.
        </p>
      </AppShell>
    );
  }

  const ativos = objetivos.filter((o) => !o.arquivado);
  const arquivados = objetivos.filter((o) => o.arquivado);
  const lista = mostrarArquivados ? arquivados : ativos;

  function abrirNovo() {
    setNome("");
    setInstrucao("");
    setEditando("novo");
  }

  function abrirEdicao(o: Objective) {
    setNome(o.nome);
    setInstrucao(o.instrucao);
    setEditando(o);
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Objetivos de story</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={mostrarArquivados ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setMostrarArquivados((v) => !v)}
          >
            <Archive className="size-4" />
            {mostrarArquivados ? `Arquivados (${arquivados.length})` : `Arquivados (${arquivados.length})`}
          </Button>
          <Button size="sm" className="gap-1" onClick={abrirNovo}>
            <Plus className="size-4" /> Novo objetivo
          </Button>
        </div>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        O objetivo descreve a intenção de um story inteiro. A instrução é o texto que explica o que
        caracteriza esse objetivo.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {mostrarArquivados
            ? "Nenhum objetivo arquivado."
            : "Nenhum objetivo cadastrado ainda. Clique em “Novo objetivo” para começar."}
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.nome}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {o.instrucao || "Sem instrução."}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => abrirEdicao(o)}>
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => arquivar.mutate(o)}
                  >
                    {o.arquivado ? (
                      <>
                        <ArchiveRestore className="size-3.5" /> Reativar
                      </>
                    ) : (
                      <>
                        <Archive className="size-3.5" /> Arquivar
                      </>
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label="Excluir objetivo"
                    onClick={() => {
                      setExcluindo(o);
                      setConfirmacao("");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editando !== null} onOpenChange={(open) => (open ? null : setEditando(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando === "novo" ? "Novo objetivo" : "Editar objetivo"}</DialogTitle>
            <DialogDescription>
              O nome é usado nas listas e no arquivo importado. A instrução é o texto completo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="obj-nome">Nome do objetivo</Label>
              <Input
                id="obj-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Prova social"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obj-instrucao">Instrução do objetivo</Label>
              <Textarea
                id="obj-instrucao"
                rows={8}
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="Cole aqui a orientação que explica o que caracteriza esse objetivo."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="gap-1" onClick={() => setEditando(null)}>
              <X className="size-4" /> Cancelar
            </Button>
            <Button
              disabled={nome.trim().length === 0 || salvar.isPending}
              onClick={() => salvar.mutate()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={excluindo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExcluindo(null);
            setConfirmacao("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir objetivo</DialogTitle>
            <DialogDescription>
              Esta exclusão é definitiva. Para confirmar, digite o nome do objetivo abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="obj-confirma">Nome: {excluindo?.nome}</Label>
            <Input
              id="obj-confirma"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="Digite o nome exato"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                !excluindo || confirmacao.trim() !== excluindo.nome.trim() || excluir.isPending
              }
              onClick={() => excluindo && excluir.mutate(excluindo)}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
