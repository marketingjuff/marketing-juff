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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          nome: string
          permissions: string[]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          must_change_password?: boolean
          nome?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          nome?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _perm: string }; Returns: boolean }
      has_permission: { Args: { _perm: string }; Returns: boolean }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      recalc_story_status: { Args: { _story_id: string }; Returns: undefined }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
