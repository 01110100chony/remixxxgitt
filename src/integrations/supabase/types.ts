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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          authors: string | null
          citations: number | null
          created_at: string
          doi: string | null
          id: string
          issn: string | null
          journal: string | null
          qualis: string | null
          researcher_id: string
          title: string
          year: number | null
        }
        Insert: {
          authors?: string | null
          citations?: number | null
          created_at?: string
          doi?: string | null
          id?: string
          issn?: string | null
          journal?: string | null
          qualis?: string | null
          researcher_id: string
          title: string
          year?: number | null
        }
        Update: {
          authors?: string | null
          citations?: number | null
          created_at?: string
          doi?: string | null
          id?: string
          issn?: string | null
          journal?: string | null
          qualis?: string | null
          researcher_id?: string
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      orientations: {
        Row: {
          created_at: string
          id: string
          researcher_id: string
          status: string
          student: string | null
          title: string | null
          type: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          researcher_id: string
          status?: string
          student?: string | null
          title?: string | null
          type: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          researcher_id?: string
          status?: string
          student?: string | null
          title?: string | null
          type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orientations_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          program_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          program_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          program_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          institution: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          funder: string | null
          funding: string | null
          id: string
          partner_institution: string | null
          researcher_id: string
          title: string
          type: string | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          created_at?: string
          funder?: string | null
          funding?: string | null
          id?: string
          partner_institution?: string | null
          researcher_id: string
          title: string
          type?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          created_at?: string
          funder?: string | null
          funding?: string | null
          id?: string
          partner_institution?: string | null
          researcher_id?: string
          title?: string
          type?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      qualis_reference: {
        Row: {
          area: string | null
          classification: string
          id: string
          issn: string
        }
        Insert: {
          area?: string | null
          classification: string
          id?: string
          issn: string
        }
        Update: {
          area?: string | null
          classification?: string
          id?: string
          issn?: string
        }
        Relationships: []
      }
      researcher_metrics: {
        Row: {
          h_index: number | null
          i10_index: number | null
          id: string
          researcher_id: string
          source: string | null
          total_citations: number | null
          updated_at: string
        }
        Insert: {
          h_index?: number | null
          i10_index?: number | null
          id?: string
          researcher_id: string
          source?: string | null
          total_citations?: number | null
          updated_at?: string
        }
        Update: {
          h_index?: number | null
          i10_index?: number | null
          id?: string
          researcher_id?: string
          source?: string | null
          total_citations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_metrics_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: true
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      researchers: {
        Row: {
          created_at: string
          gender: string | null
          id: string
          lattes_xml_filename: string | null
          name: string
          orcid: string | null
          program_id: string
          research_line: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: string
          lattes_xml_filename?: string | null
          name: string
          orcid?: string | null
          program_id: string
          research_line?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          lattes_xml_filename?: string | null
          name?: string
          orcid?: string | null
          program_id?: string
          research_line?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "researchers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewer_activities: {
        Row: {
          created_at: string
          id: string
          journal_event: string
          researcher_id: string
          type: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          journal_event: string
          researcher_id: string
          type?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          journal_event?: string
          researcher_id?: string
          type?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_activities_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_productions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          researcher_id: string
          title: string | null
          type: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          researcher_id: string
          title?: string | null
          type: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          researcher_id?: string
          title?: string | null
          type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_productions_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "researcher" | "viewer"
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
      app_role: ["admin", "coordinator", "researcher", "viewer"],
    },
  },
} as const
