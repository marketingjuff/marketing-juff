export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_marcos: {
        Row: {
          aplicado_em: string
          chave: string
        }
        Insert: {
          aplicado_em?: string
          chave: string
        }
        Update: {
          aplicado_em?: string
          chave?: string
        }
        Relationships: []
      }
      atalhos_paginas: {
        Row: {
          created_at: string
          destino: string | null
          id: string
          label: string
          posicao: number
          quadro_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          destino?: string | null
          id?: string
          label: string
          posicao?: number
          quadro_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          destino?: string | null
          id?: string
          label?: string
          posicao?: number
          quadro_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atalhos_paginas_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atalhos_paginas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_arquivo_grupos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          posicao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          posicao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          posicao?: number
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_arquivos: {
        Row: {
          ativo: boolean
          caminho: string
          created_at: string
          formato: string
          grupo_id: string
          id: string
          nome: string
          posicao: number
          tamanho_bytes: number
          variacao: string
        }
        Insert: {
          ativo?: boolean
          caminho: string
          created_at?: string
          formato: string
          grupo_id: string
          id?: string
          nome: string
          posicao?: number
          tamanho_bytes?: number
          variacao?: string
        }
        Update: {
          ativo?: boolean
          caminho?: string
          created_at?: string
          formato?: string
          grupo_id?: string
          id?: string
          nome?: string
          posicao?: number
          tamanho_bytes?: number
          variacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_arquivos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_arquivo_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_carga_log: {
        Row: {
          criado_em: string
          id: string
          nome: string
          relatorio: Json
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          relatorio: Json
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          relatorio?: Json
        }
        Relationships: []
      }
      biblioteca_combo_itens: {
        Row: {
          c: number
          codigo: string
          combo_id: string
          k: number
          m: number
          ordem: number
          y: number
        }
        Insert: {
          c?: number
          codigo: string
          combo_id: string
          k?: number
          m?: number
          ordem: number
          y?: number
        }
        Update: {
          c?: number
          codigo?: string
          combo_id?: string
          k?: number
          m?: number
          ordem?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_combo_itens_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_combos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_combos: {
        Row: {
          codigo: string
          cor_id: string | null
          created_at: string
          genero: string
          id: string
          posicao: number
        }
        Insert: {
          codigo: string
          cor_id?: string | null
          created_at?: string
          genero: string
          id?: string
          posicao?: number
        }
        Update: {
          codigo?: string
          cor_id?: string | null
          created_at?: string
          genero?: string
          id?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_combos_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_cores"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_cores: {
        Row: {
          ativo: boolean
          created_at: string
          hex: string
          id: string
          nome: string
          nome_olist: string
          posicao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          hex: string
          id?: string
          nome: string
          nome_olist: string
          posicao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          hex?: string
          id?: string
          nome?: string
          nome_olist?: string
          posicao?: number
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_estampa_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          posicao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          posicao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          posicao?: number
        }
        Relationships: []
      }
      biblioteca_estampa_cores: {
        Row: {
          ativo: boolean
          c: number
          codigo: string
          created_at: string
          familia: string
          hex: string
          id: string
          k: number
          m: number
          nome: string
          posicao: number
          updated_at: string
          y: number
        }
        Insert: {
          ativo?: boolean
          c?: number
          codigo: string
          created_at?: string
          familia?: string
          hex: string
          id?: string
          k?: number
          m?: number
          nome?: string
          posicao?: number
          updated_at?: string
          y?: number
        }
        Update: {
          ativo?: boolean
          c?: number
          codigo?: string
          created_at?: string
          familia?: string
          hex?: string
          id?: string
          k?: number
          m?: number
          nome?: string
          posicao?: number
          updated_at?: string
          y?: number
        }
        Relationships: []
      }
      biblioteca_estampa_cores_camiseta: {
        Row: {
          cor_id: string
          estampa_id: string
          posicao: number
        }
        Insert: {
          cor_id: string
          estampa_id: string
          posicao?: number
        }
        Update: {
          cor_id?: string
          estampa_id?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_cores_camiseta_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_cores_camiseta_estampa_id_fkey"
            columns: ["estampa_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampa_grupo_modelos: {
        Row: {
          estampa_id: string
          grupo_id: string
          produto_id: string
        }
        Insert: {
          estampa_id: string
          grupo_id: string
          produto_id: string
        }
        Update: {
          estampa_id?: string
          grupo_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_grupo_modelos_estampa_id_fkey"
            columns: ["estampa_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_grupo_modelos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampa_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_grupo_modelos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampa_grupos: {
        Row: {
          estampa_id: string
          id: string
          nome: string
          posicao: number
        }
        Insert: {
          estampa_id: string
          id?: string
          nome?: string
          posicao?: number
        }
        Update: {
          estampa_id?: string
          id?: string
          nome?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_grupos_estampa_id_fkey"
            columns: ["estampa_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampa_papeis: {
        Row: {
          estampa_id: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          estampa_id: string
          id?: string
          nome?: string
          ordem: number
        }
        Update: {
          estampa_id?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_papeis_estampa_id_fkey"
            columns: ["estampa_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampa_receita_itens: {
        Row: {
          c: number
          codigo: string
          k: number
          m: number
          ordem: number
          receita_id: string
          y: number
        }
        Insert: {
          c?: number
          codigo: string
          k?: number
          m?: number
          ordem: number
          receita_id: string
          y?: number
        }
        Update: {
          c?: number
          codigo?: string
          k?: number
          m?: number
          ordem?: number
          receita_id?: string
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_receita_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampa_receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampa_receitas: {
        Row: {
          combo_id: string | null
          cor_id: string
          estampa_id: string
          grupo_id: string
          id: string
          publico: string | null
        }
        Insert: {
          combo_id?: string | null
          cor_id: string
          estampa_id: string
          grupo_id: string
          id?: string
          publico?: string | null
        }
        Update: {
          combo_id?: string | null
          cor_id?: string
          estampa_id?: string
          grupo_id?: string
          id?: string
          publico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampa_receitas_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_receitas_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_receitas_estampa_id_fkey"
            columns: ["estampa_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_estampa_receitas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampa_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_estampas: {
        Row: {
          categoria_id: string | null
          created_at: string
          ficha_caminho: string | null
          id: string
          imagem_caminho: string | null
          nome: string
          posicao: number
          situacao: string
          tamanho_adulto: string
          tamanho_feminino: string
          tamanho_infantil: string
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          ficha_caminho?: string | null
          id?: string
          imagem_caminho?: string | null
          nome: string
          posicao?: number
          situacao?: string
          tamanho_adulto?: string
          tamanho_feminino?: string
          tamanho_infantil?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          ficha_caminho?: string | null
          id?: string
          imagem_caminho?: string | null
          nome?: string
          posicao?: number
          situacao?: string
          tamanho_adulto?: string
          tamanho_feminino?: string
          tamanho_infantil?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_estampas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_estampa_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_medidas: {
        Row: {
          alvo: number | null
          maximo: number | null
          minimo: number | null
          ponto: string
          produto_id: string
          tamanho: string
        }
        Insert: {
          alvo?: number | null
          maximo?: number | null
          minimo?: number | null
          ponto: string
          produto_id: string
          tamanho: string
        }
        Update: {
          alvo?: number | null
          maximo?: number | null
          minimo?: number | null
          ponto?: string
          produto_id?: string
          tamanho?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_medidas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_paleta: {
        Row: {
          ativo: boolean
          created_at: string
          hex: string
          id: string
          nome: string
          posicao: number
          rascunho: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          hex: string
          id?: string
          nome: string
          posicao?: number
          rascunho?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          hex?: string
          id?: string
          nome?: string
          posicao?: number
          rascunho?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_produto_cores: {
        Row: {
          categoria: string
          cor_id: string
          produto_id: string
        }
        Insert: {
          categoria?: string
          cor_id: string
          produto_id: string
        }
        Update: {
          categoria?: string
          cor_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_produto_cores_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_produto_cores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_base: string
          pontos: string[]
          posicao: number
          sufixo: string
          tamanhos: string[]
          tamanhos_xtra: string[]
          tecido: string
          updated_at: string
          usa_sufixo: boolean
          usa_tecido: boolean
          usa_xtra: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_base: string
          pontos?: string[]
          posicao?: number
          sufixo?: string
          tamanhos?: string[]
          tamanhos_xtra?: string[]
          tecido?: string
          updated_at?: string
          usa_sufixo?: boolean
          usa_tecido?: boolean
          usa_xtra?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_base?: string
          pontos?: string[]
          posicao?: number
          sufixo?: string
          tamanhos?: string[]
          tamanhos_xtra?: string[]
          tecido?: string
          updated_at?: string
          usa_sufixo?: boolean
          usa_tecido?: boolean
          usa_xtra?: boolean
        }
        Relationships: []
      }
      biblioteca_textos: {
        Row: {
          ativo: boolean
          created_at: string
          grupo: string
          id: string
          observacao: string | null
          posicao: number
          texto: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo: string
          id?: string
          observacao?: string | null
          posicao?: number
          texto: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo?: string
          id?: string
          observacao?: string | null
          posicao?: number
          texto?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estrategia_atas: {
        Row: {
          ano: number
          anotacoes: string
          created_at: string
          criado_por: string | null
          frente: string
          id: string
          mes: number
          updated_at: string
        }
        Insert: {
          ano: number
          anotacoes?: string
          created_at?: string
          criado_por?: string | null
          frente: string
          id?: string
          mes: number
          updated_at?: string
        }
        Update: {
          ano?: number
          anotacoes?: string
          created_at?: string
          criado_por?: string | null
          frente?: string
          id?: string
          mes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrategia_atas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estrategia_campos: {
        Row: {
          ativo: boolean
          created_at: string
          frente: string
          icone: string
          id: string
          label: string
          no_panorama: boolean
          posicao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          frente: string
          icone?: string
          id?: string
          label?: string
          no_panorama?: boolean
          posicao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          frente?: string
          icone?: string
          id?: string
          label?: string
          no_panorama?: boolean
          posicao?: number
        }
        Relationships: []
      }
      estrategia_decisoes: {
        Row: {
          ata_id: string
          card_id: string | null
          created_at: string
          criado_por: string | null
          id: string
          posicao: number
          prazo: string | null
          responsavel_id: string | null
          texto: string
        }
        Insert: {
          ata_id: string
          card_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          posicao?: number
          prazo?: string | null
          responsavel_id?: string | null
          texto?: string
        }
        Update: {
          ata_id?: string
          card_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          posicao?: number
          prazo?: string | null
          responsavel_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrategia_decisoes_ata_id_fkey"
            columns: ["ata_id"]
            isOneToOne: false
            referencedRelation: "estrategia_atas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrategia_decisoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrategia_decisoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrategia_decisoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estrategia_valores: {
        Row: {
          ata_id: string
          campo_id: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          ata_id: string
          campo_id: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          ata_id?: string
          campo_id?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrategia_valores_ata_id_fkey"
            columns: ["ata_id"]
            isOneToOne: false
            referencedRelation: "estrategia_atas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrategia_valores_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "estrategia_campos"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      meudia_diario: {
        Row: {
          data: string
          modo: string | null
          texto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: string
          modo?: string | null
          texto?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: string
          modo?: string | null
          texto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meudia_diario_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meudia_excecoes: {
        Row: {
          data: string
          recorrente_id: string
          user_id: string
        }
        Insert: {
          data: string
          recorrente_id: string
          user_id: string
        }
        Update: {
          data?: string
          recorrente_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meudia_excecoes_recorrente_id_fkey"
            columns: ["recorrente_id"]
            isOneToOne: false
            referencedRelation: "meudia_recorrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meudia_excecoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meudia_itens: {
        Row: {
          bloco_inicio: number
          blocos: number
          card_id: string | null
          created_at: string
          data: string
          feito: boolean
          id: string
          recorrente_id: string | null
          texto: string
          user_id: string
        }
        Insert: {
          bloco_inicio: number
          blocos?: number
          card_id?: string | null
          created_at?: string
          data: string
          feito?: boolean
          id?: string
          recorrente_id?: string | null
          texto?: string
          user_id: string
        }
        Update: {
          bloco_inicio?: number
          blocos?: number
          card_id?: string | null
          created_at?: string
          data?: string
          feito?: boolean
          id?: string
          recorrente_id?: string | null
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meudia_itens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meudia_itens_recorrente_id_fkey"
            columns: ["recorrente_id"]
            isOneToOne: false
            referencedRelation: "meudia_recorrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meudia_itens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meudia_recorrentes: {
        Row: {
          ativo: boolean
          blocos: number
          created_at: string
          descricao: string
          dia_semana: string
          encerrado_em: string | null
          hora: string | null
          id: string
          posicao: number
          user_id: string
          vezes_mes: number
        }
        Insert: {
          ativo?: boolean
          blocos?: number
          created_at?: string
          descricao?: string
          dia_semana?: string
          encerrado_em?: string | null
          hora?: string | null
          id?: string
          posicao?: number
          user_id: string
          vezes_mes?: number
        }
        Update: {
          ativo?: boolean
          blocos?: number
          created_at?: string
          descricao?: string
          dia_semana?: string
          encerrado_em?: string | null
          hora?: string | null
          id?: string
          posicao?: number
          user_id?: string
          vezes_mes?: number
        }
        Relationships: [
          {
            foreignKeyName: "meudia_recorrentes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_preferencias: {
        Row: {
          ativo: boolean
          push: boolean
          tipo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          push?: boolean
          tipo: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          push?: boolean
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_preferencias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          card_id: string | null
          created_at: string
          detalhe: string
          dia: string
          id: string
          lida: boolean
          push_enviado_em: string | null
          quadro_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          detalhe?: string
          dia?: string
          id?: string
          lida?: boolean
          push_enviado_em?: string | null
          quadro_id?: string | null
          tipo: string
          titulo?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          detalhe?: string
          dia?: string
          id?: string
          lida?: boolean
          push_enviado_em?: string | null
          quadro_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cor_avatar: string | null
          cor_texto_avatar: string | null
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          nome: string
          permissions: string[]
          role: Database["public"]["Enums"]["app_role"]
          sigla: string | null
        }
        Insert: {
          cor_avatar?: string | null
          cor_texto_avatar?: string | null
          created_at?: string
          email?: string
          id: string
          must_change_password?: boolean
          nome?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["app_role"]
          sigla?: string | null
        }
        Update: {
          cor_avatar?: string | null
          cor_texto_avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          nome?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["app_role"]
          sigla?: string | null
        }
        Relationships: []
      }
      push_inscricoes: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          falhas: number
          id: string
          navegador: string
          p256dh: string
          ultimo_envio: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          falhas?: number
          id?: string
          navegador?: string
          p256dh: string
          ultimo_envio?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          falhas?: number
          id?: string
          navegador?: string
          p256dh?: string
          ultimo_envio?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          adjust_comment: string | null
          adjust_comment_at: string | null
          created_at: string
          descartado: boolean
          id: string
          nome_bloco: string
          objective_id: string | null
          position: number
          publicado_em: string | null
          publicado_por: string | null
          sequence_id: string | null
          status: string
        }
        Insert: {
          adjust_comment?: string | null
          adjust_comment_at?: string | null
          created_at?: string
          descartado?: boolean
          id?: string
          nome_bloco?: string
          objective_id?: string | null
          position?: number
          publicado_em?: string | null
          publicado_por?: string | null
          sequence_id?: string | null
          status?: string
        }
        Update: {
          adjust_comment?: string | null
          adjust_comment_at?: string | null
          created_at?: string
          descartado?: boolean
          id?: string
          nome_bloco?: string
          objective_id?: string | null
          position?: number
          publicado_em?: string | null
          publicado_por?: string | null
          sequence_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "story_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "story_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      story_ctas: {
        Row: {
          arquivado: boolean
          created_at: string
          grupo: string
          id: string
          texto: string
          updated_at: string
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          grupo?: string
          id?: string
          texto: string
          updated_at?: string
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          grupo?: string
          id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_frames: {
        Row: {
          adjust_comment: string | null
          adjust_comment_at: string | null
          comp_logo_ativo: boolean
          comp_logo_cor: string
          comp_logo_id: string | null
          comp_logo_tamanho: number
          comp_logo_x: number
          comp_logo_y: number
          comp_sombra_cor: string
          comp_sombra_opacidade: number
          comp_texto_alinhamento: string
          comp_texto_cor: string
          comp_texto_fonte: string
          comp_texto_largura: number
          comp_texto_peso: number
          comp_texto_tamanho: number
          comp_texto_x: number
          comp_texto_y: number
          created_at: string
          cta: string
          cta_link: string
          id: string
          image_path: string
          image_path_anterior: string | null
          nome_arquivo: string
          observacao: string
          ordem: number
          recurso: string
          recurso_detalhe: string
          status: string
          story_id: string
          texto_principal: string
          trocado_em: string | null
        }
        Insert: {
          adjust_comment?: string | null
          adjust_comment_at?: string | null
          comp_logo_ativo?: boolean
          comp_logo_cor?: string
          comp_logo_id?: string | null
          comp_logo_tamanho?: number
          comp_logo_x?: number
          comp_logo_y?: number
          comp_sombra_cor?: string
          comp_sombra_opacidade?: number
          comp_texto_alinhamento?: string
          comp_texto_cor?: string
          comp_texto_fonte?: string
          comp_texto_largura?: number
          comp_texto_peso?: number
          comp_texto_tamanho?: number
          comp_texto_x?: number
          comp_texto_y?: number
          created_at?: string
          cta?: string
          cta_link?: string
          id?: string
          image_path: string
          image_path_anterior?: string | null
          nome_arquivo?: string
          observacao?: string
          ordem?: number
          recurso?: string
          recurso_detalhe?: string
          status?: string
          story_id: string
          texto_principal?: string
          trocado_em?: string | null
        }
        Update: {
          adjust_comment?: string | null
          adjust_comment_at?: string | null
          comp_logo_ativo?: boolean
          comp_logo_cor?: string
          comp_logo_id?: string | null
          comp_logo_tamanho?: number
          comp_logo_x?: number
          comp_logo_y?: number
          comp_sombra_cor?: string
          comp_sombra_opacidade?: number
          comp_texto_alinhamento?: string
          comp_texto_cor?: string
          comp_texto_fonte?: string
          comp_texto_largura?: number
          comp_texto_peso?: number
          comp_texto_tamanho?: number
          comp_texto_x?: number
          comp_texto_y?: number
          created_at?: string
          cta?: string
          cta_link?: string
          id?: string
          image_path?: string
          image_path_anterior?: string | null
          nome_arquivo?: string
          observacao?: string
          ordem?: number
          recurso?: string
          recurso_detalhe?: string
          status?: string
          story_id?: string
          texto_principal?: string
          trocado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_frames_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_links: {
        Row: {
          arquivado: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          updated_at: string
          url: string
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          updated_at?: string
          url: string
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      story_logos: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          id: string
          nome: string
          proporcao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          id?: string
          nome: string
          proporcao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          id?: string
          nome?: string
          proporcao?: number
        }
        Relationships: []
      }
      story_objectives: {
        Row: {
          arquivado: boolean
          created_at: string
          id: string
          instrucao: string
          nome: string
          updated_at: string
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          id?: string
          instrucao?: string
          nome: string
          updated_at?: string
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          id?: string
          instrucao?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_sequences: {
        Row: {
          arquivado: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      story_text_presets: {
        Row: {
          alinhamento: string
          cor_sombra: string
          cor_texto: string
          created_at: string
          created_by: string | null
          fonte: string
          id: string
          nome: string
          opacidade_sombra: number
          peso: number
          tamanho: number
        }
        Insert: {
          alinhamento?: string
          cor_sombra?: string
          cor_texto?: string
          created_at?: string
          created_by?: string | null
          fonte?: string
          id?: string
          nome: string
          opacidade_sombra?: number
          peso?: number
          tamanho?: number
        }
        Update: {
          alinhamento?: string
          cor_sombra?: string
          cor_texto?: string
          created_at?: string
          created_by?: string | null
          fonte?: string
          id?: string
          nome?: string
          opacidade_sombra?: number
          peso?: number
          tamanho?: number
        }
        Relationships: []
      }
      tarefa_anexos: {
        Row: {
          card_id: string
          created_at: string
          enviado_por: string | null
          id: string
          nome: string
          path: string
          tamanho: number
          tipo: string
        }
        Insert: {
          card_id: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          nome?: string
          path: string
          tamanho?: number
          tipo?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          nome?: string
          path?: string
          tamanho?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_anexos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_anexos_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_card_etiquetas: {
        Row: {
          card_id: string
          etiqueta_id: string
        }
        Insert: {
          card_id: string
          etiqueta_id: string
        }
        Update: {
          card_id?: string
          etiqueta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_card_etiquetas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_card_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "tarefa_etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_card_resp_coluna: {
        Row: {
          atualizado_em: string
          card_id: string
          coluna_id: string
          responsavel_id: string | null
        }
        Insert: {
          atualizado_em?: string
          card_id: string
          coluna_id: string
          responsavel_id?: string | null
        }
        Update: {
          atualizado_em?: string
          card_id?: string
          coluna_id?: string
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_card_resp_coluna_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_card_resp_coluna_coluna_id_fkey"
            columns: ["coluna_id"]
            isOneToOne: false
            referencedRelation: "tarefa_colunas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_cards: {
        Row: {
          adiado_ate: string | null
          arquivado: boolean
          coluna_desde: string
          coluna_id: string
          concluido: boolean
          concluido_em: string | null
          cor: string | null
          cor_fundo: string | null
          created_at: string
          criado_por: string | null
          data_entrega: string | null
          data_inicio: string | null
          depende_de: string
          descricao: string
          esforco: string | null
          hora_entrega: string | null
          hora_inicio: string | null
          id: string
          lembrete_min: number | null
          link_externo: string
          posicao: number
          prioridade: string | null
          quadro_id: string
          recorrencia: string
          responsavel_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          adiado_ate?: string | null
          arquivado?: boolean
          coluna_desde?: string
          coluna_id: string
          concluido?: boolean
          concluido_em?: string | null
          cor?: string | null
          cor_fundo?: string | null
          created_at?: string
          criado_por?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          depende_de?: string
          descricao?: string
          esforco?: string | null
          hora_entrega?: string | null
          hora_inicio?: string | null
          id?: string
          lembrete_min?: number | null
          link_externo?: string
          posicao?: number
          prioridade?: string | null
          quadro_id: string
          recorrencia?: string
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          adiado_ate?: string | null
          arquivado?: boolean
          coluna_desde?: string
          coluna_id?: string
          concluido?: boolean
          concluido_em?: string | null
          cor?: string | null
          cor_fundo?: string | null
          created_at?: string
          criado_por?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          depende_de?: string
          descricao?: string
          esforco?: string | null
          hora_entrega?: string | null
          hora_inicio?: string | null
          id?: string
          lembrete_min?: number | null
          link_externo?: string
          posicao?: number
          prioridade?: string | null
          quadro_id?: string
          recorrencia?: string
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_cards_coluna_id_fkey"
            columns: ["coluna_id"]
            isOneToOne: false
            referencedRelation: "tarefa_colunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_cards_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_cards_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_checklist: {
        Row: {
          card_id: string
          created_at: string
          feito: boolean
          id: string
          posicao: number
          texto: string
        }
        Insert: {
          card_id: string
          created_at?: string
          feito?: boolean
          id?: string
          posicao?: number
          texto?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          feito?: boolean
          id?: string
          posicao?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_checklist_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_colunas: {
        Row: {
          arquivado: boolean
          conclui: boolean
          created_at: string
          id: string
          limite_wip: number | null
          nome: string
          posicao: number
          quadro_id: string
          resp_ao_entrar: string
          resp_coluna_origem_id: string | null
        }
        Insert: {
          arquivado?: boolean
          conclui?: boolean
          created_at?: string
          id?: string
          limite_wip?: number | null
          nome?: string
          posicao?: number
          quadro_id: string
          resp_ao_entrar?: string
          resp_coluna_origem_id?: string | null
        }
        Update: {
          arquivado?: boolean
          conclui?: boolean
          created_at?: string
          id?: string
          limite_wip?: number | null
          nome?: string
          posicao?: number
          quadro_id?: string
          resp_ao_entrar?: string
          resp_coluna_origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_colunas_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_colunas_resp_coluna_origem_id_fkey"
            columns: ["resp_coluna_origem_id"]
            isOneToOne: false
            referencedRelation: "tarefa_colunas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_comentarios: {
        Row: {
          autor_id: string | null
          card_id: string
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          autor_id?: string | null
          card_id: string
          created_at?: string
          id?: string
          texto?: string
        }
        Update: {
          autor_id?: string | null
          card_id?: string
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_comentarios_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_cores_salvas: {
        Row: {
          created_at: string
          criado_por: string | null
          hex: string
          id: string
          posicao: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          hex: string
          id?: string
          posicao: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          hex?: string
          id?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_cores_salvas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_etiquetas: {
        Row: {
          arquivado: boolean
          cor: string
          cor_texto: string
          created_at: string
          id: string
          nome: string
          pessoa_id: string | null
          posicao: number
          quadro_id: string | null
        }
        Insert: {
          arquivado?: boolean
          cor?: string
          cor_texto?: string
          created_at?: string
          id?: string
          nome: string
          pessoa_id?: string | null
          posicao?: number
          quadro_id?: string | null
        }
        Update: {
          arquivado?: boolean
          cor?: string
          cor_texto?: string
          created_at?: string
          id?: string
          nome?: string
          pessoa_id?: string | null
          posicao?: number
          quadro_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_etiquetas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_etiquetas_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_historico: {
        Row: {
          acao: string
          autor_id: string | null
          card_id: string
          created_at: string
          detalhe: string
          id: string
        }
        Insert: {
          acao: string
          autor_id?: string | null
          card_id: string
          created_at?: string
          detalhe?: string
          id?: string
        }
        Update: {
          acao?: string
          autor_id?: string | null
          card_id?: string
          created_at?: string
          detalhe?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_historico_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_historico_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tarefa_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_quadro_atalhos: {
        Row: {
          aberturas: number
          fixado: boolean
          quadro_id: string
          ultimo_acesso: string
          user_id: string
        }
        Insert: {
          aberturas?: number
          fixado?: boolean
          quadro_id: string
          ultimo_acesso?: string
          user_id: string
        }
        Update: {
          aberturas?: number
          fixado?: boolean
          quadro_id?: string
          ultimo_acesso?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_quadro_atalhos_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_quadro_membros: {
        Row: {
          created_at: string
          quadro_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          quadro_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          quadro_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_quadro_membros_quadro_id_fkey"
            columns: ["quadro_id"]
            isOneToOne: false
            referencedRelation: "tarefa_quadros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_quadro_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_quadros: {
        Row: {
          acesso: string
          arquivado: boolean
          created_at: string
          criado_por: string | null
          descricao: string
          etiqueta_do_criador: boolean
          exige_responsavel: boolean
          fundo_cor1: string
          fundo_cor2: string
          fundo_tipo: string
          id: string
          nome: string
          posicao: number
        }
        Insert: {
          acesso?: string
          arquivado?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string
          etiqueta_do_criador?: boolean
          exige_responsavel?: boolean
          fundo_cor1?: string
          fundo_cor2?: string
          fundo_tipo?: string
          id?: string
          nome?: string
          posicao?: number
        }
        Update: {
          acesso?: string
          arquivado?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string
          etiqueta_do_criador?: boolean
          exige_responsavel?: boolean
          fundo_cor1?: string
          fundo_cor2?: string
          fundo_tipo?: string
          id?: string
          nome?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_quadros_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      biblioteca_carga_cor: { Args: { t: string }; Returns: string }
      biblioteca_carga_fichas: { Args: { p: Json }; Returns: Json }
      biblioteca_combo_registrar: {
        Args: { p_cor_id: string; p_genero: string; p_itens: Json }
        Returns: {
          codigo: string
          criado: boolean
          id: string
        }[]
      }
      biblioteca_combo_uso: {
        Args: never
        Returns: {
          combo_id: string
          estampas: string[]
          total: number
        }[]
      }
      biblioteca_estampa_apagar_receita: {
        Args: { p_receita_id: string }
        Returns: undefined
      }
      biblioteca_estampa_salvar_receita: {
        Args: {
          p_combo_id: string
          p_cor_id: string
          p_estampa_id: string
          p_grupo_id: string
          p_itens: Json
        }
        Returns: string
      }
      biblioteca_norm: { Args: { t: string }; Returns: string }
      biblioteca_proximo_codigo_combo: { Args: never; Returns: string }
      biblioteca_salvar_cores: {
        Args: { p_cores: Json; p_produto_id: string }
        Returns: undefined
      }
      biblioteca_salvar_medidas: {
        Args: { p_medidas: Json; p_produto_id: string }
        Returns: undefined
      }
      can_edit: { Args: { _perm: string }; Returns: boolean }
      estrategia_ata_id: {
        Args: { _ano: number; _frente: string; _mes: number }
        Returns: string
      }
      estrategia_gravar_anotacoes: {
        Args: { _ano: number; _frente: string; _mes: number; _texto: string }
        Returns: string
      }
      estrategia_gravar_valor: {
        Args: {
          _ano: number
          _campo_id: string
          _frente: string
          _mes: number
          _valor: string
        }
        Returns: string
      }
      estrategia_reordenar_campos: {
        Args: { _frente: string; _ids: string[] }
        Returns: undefined
      }
      has_permission: { Args: { _perm: string }; Returns: boolean }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      meudia_gravar_diario: {
        Args: { _data: string; _modo: string; _texto: string }
        Returns: undefined
      }
      meudia_reordenar_recorrentes: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      notificacoes_gerar_diarias: { Args: never; Returns: number }
      notificacoes_gerar_lembretes: { Args: never; Returns: number }
      notificacoes_marcar_todas: { Args: never; Returns: number }
      notificar: {
        Args: {
          _card_id: string
          _detalhe: string
          _quadro_id: string
          _tipo: string
          _titulo: string
          _user_id: string
        }
        Returns: undefined
      }
      pode_editar_card: { Args: { _card_id: string }; Returns: boolean }
      pode_editar_quadro: { Args: { _quadro_id: string }; Returns: boolean }
      pode_escrever_estrategia: { Args: never; Returns: boolean }
      pode_estruturar_quadro: { Args: { _quadro_id: string }; Returns: boolean }
      pode_mexer_card: { Args: { _card_id: string }; Returns: boolean }
      pode_ver_card: { Args: { _card_id: string }; Returns: boolean }
      pode_ver_quadro: { Args: { _quadro_id: string }; Returns: boolean }
      proxima_ocorrencia: {
        Args: { _data: string; _regra: string }
        Returns: string
      }
      push_marcar_falha: { Args: { _id: string }; Returns: undefined }
      recalc_story_status: { Args: { _story_id: string }; Returns: undefined }
      registrar_abertura_quadro: {
        Args: { p_quadro_id: string }
        Returns: undefined
      }
      reordenar_atalhos: { Args: { p_ids: string[] }; Returns: undefined }
      tarefa_avancar_recorrentes: { Args: never; Returns: number }
      tarefa_card_avancar: { Args: { _id: string }; Returns: string }
      tarefa_reordenar_cards: {
        Args: { _coluna_id: string; _ids: string[] }
        Returns: undefined
      }
      tarefa_reordenar_etiquetas: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      tarefa_set_quadros_do_usuario: {
        Args: { _quadro_ids: string[]; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "operador"],
    },
  },
} as const
