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
      access_requests: {
        Row: {
          created_at: string
          full_name: string
          id: string
          institutional_email: string | null
          lattes_url: string | null
          message: string | null
          program_id: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          institutional_email?: string | null
          lattes_url?: string | null
          message?: string | null
          program_id: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          institutional_email?: string | null
          lattes_url?: string | null
          message?: string | null
          program_id?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          authors: string | null
          citations: number | null
          created_at: string
          doi: string | null
          id: string
          is_active: boolean
          isbn: string | null
          issn: string | null
          journal: string | null
          program_id: string | null
          qualis: string | null
          researcher_id: string
          source_origin: string
          title: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          citations?: number | null
          created_at?: string
          doi?: string | null
          id?: string
          is_active?: boolean
          isbn?: string | null
          issn?: string | null
          journal?: string | null
          program_id?: string | null
          qualis?: string | null
          researcher_id: string
          source_origin?: string
          title: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          citations?: number | null
          created_at?: string
          doi?: string | null
          id?: string
          is_active?: boolean
          isbn?: string | null
          issn?: string | null
          journal?: string | null
          program_id?: string | null
          qualis?: string | null
          researcher_id?: string
          source_origin?: string
          title?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_entries: {
        Row: {
          created_at: string
          h_index: number | null
          id: string
          is_public: boolean | null
          profile_link: string | null
          program_id: string | null
          reference_date: string | null
          researcher_id: string
          researcher_id_wos: string | null
          search_name: string | null
          source: string
          source_name: string | null
          total_citations: number | null
          total_works: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          h_index?: number | null
          id?: string
          is_public?: boolean | null
          profile_link?: string | null
          program_id?: string | null
          reference_date?: string | null
          researcher_id: string
          researcher_id_wos?: string | null
          search_name?: string | null
          source: string
          source_name?: string | null
          total_citations?: number | null
          total_works?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          h_index?: number | null
          id?: string
          is_public?: boolean | null
          profile_link?: string | null
          program_id?: string | null
          reference_date?: string | null
          researcher_id?: string
          researcher_id_wos?: string | null
          search_name?: string | null
          source?: string
          source_name?: string | null
          total_citations?: number | null
          total_works?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_entries_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_weights: {
        Row: {
          config: Json
          created_at: string
          id: string
          mode: string
          program_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          mode?: string
          program_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          mode?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_weights_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_metrics: {
        Row: {
          citescore: number | null
          created_at: string
          id: string
          issn: string
          journal: string | null
          sjr: number | null
          snip: number | null
          source: string
          updated_at: string
          year: number | null
        }
        Insert: {
          citescore?: number | null
          created_at?: string
          id?: string
          issn: string
          journal?: string | null
          sjr?: number | null
          snip?: number | null
          source?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          citescore?: number | null
          created_at?: string
          id?: string
          issn?: string
          journal?: string | null
          sjr?: number | null
          snip?: number | null
          source?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      lattes_processing_history: {
        Row: {
          created_at: string
          deactivated_count: number
          details: Json
          id: string
          inserted_count: number
          program_id: string | null
          researcher_id: string
          updated_count: number
          user_id: string | null
          xml_filename: string | null
          xml_path: string | null
        }
        Insert: {
          created_at?: string
          deactivated_count?: number
          details?: Json
          id?: string
          inserted_count?: number
          program_id?: string | null
          researcher_id: string
          updated_count?: number
          user_id?: string | null
          xml_filename?: string | null
          xml_path?: string | null
        }
        Update: {
          created_at?: string
          deactivated_count?: number
          details?: Json
          id?: string
          inserted_count?: number
          program_id?: string | null
          researcher_id?: string
          updated_count?: number
          user_id?: string | null
          xml_filename?: string | null
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lattes_processing_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lattes_processing_history_researcher_id_fkey"
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
          is_active: boolean
          program_id: string | null
          researcher_id: string
          source_origin: string
          status: string
          student: string | null
          title: string | null
          type: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          researcher_id: string
          source_origin?: string
          status?: string
          student?: string | null
          title?: string | null
          type: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          researcher_id?: string
          source_origin?: string
          status?: string
          student?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orientations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      other_productions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          program_id: string | null
          researcher_id: string
          title: string | null
          type: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          program_id?: string | null
          researcher_id: string
          title?: string | null
          type?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          program_id?: string | null
          researcher_id?: string
          title?: string | null
          type?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      planning_data: {
        Row: {
          config: Json
          created_at: string
          id: string
          program_id: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          program_id: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          program_id?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_data_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          institutional_email: string | null
          lattes_url: string | null
          program_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          institutional_email?: string | null
          lattes_url?: string | null
          program_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          institutional_email?: string | null
          lattes_url?: string | null
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
          area: string | null
          created_at: string
          created_by: string | null
          has_english_version: boolean | null
          id: string
          institution: string
          internationalization_score: number | null
          logo_url: string | null
          modality: string | null
          name: string
          program_code: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          social_youtube: string | null
          updated_at: string
          user_id: string | null
          website_description: string | null
          website_languages: string | null
          website_research_lines: string | null
          website_url: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          has_english_version?: boolean | null
          id?: string
          institution: string
          internationalization_score?: number | null
          logo_url?: string | null
          modality?: string | null
          name: string
          program_code?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id?: string | null
          website_description?: string | null
          website_languages?: string | null
          website_research_lines?: string | null
          website_url?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          has_english_version?: boolean | null
          id?: string
          institution?: string
          internationalization_score?: number | null
          logo_url?: string | null
          modality?: string | null
          name?: string
          program_code?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id?: string | null
          website_description?: string | null
          website_languages?: string | null
          website_research_lines?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          funder: string | null
          funding: string | null
          id: string
          is_active: boolean
          partner_institution: string | null
          program_id: string | null
          researcher_id: string
          source_origin: string
          title: string
          type: string | null
          user_id: string | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          created_at?: string
          funder?: string | null
          funding?: string | null
          id?: string
          is_active?: boolean
          partner_institution?: string | null
          program_id?: string | null
          researcher_id: string
          source_origin?: string
          title: string
          type?: string | null
          user_id?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          created_at?: string
          funder?: string | null
          funding?: string | null
          id?: string
          is_active?: boolean
          partner_institution?: string | null
          program_id?: string | null
          researcher_id?: string
          source_origin?: string
          title?: string
          type?: string | null
          user_id?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
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
          journal: string | null
        }
        Insert: {
          area?: string | null
          classification: string
          id?: string
          issn: string
          journal?: string | null
        }
        Update: {
          area?: string | null
          classification?: string
          id?: string
          issn?: string
          journal?: string | null
        }
        Relationships: []
      }
      researcher_metrics: {
        Row: {
          h_index: number | null
          i10_index: number | null
          id: string
          program_id: string | null
          researcher_id: string
          source: string | null
          total_citations: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          h_index?: number | null
          i10_index?: number | null
          id?: string
          program_id?: string | null
          researcher_id: string
          source?: string | null
          total_citations?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          h_index?: number | null
          i10_index?: number | null
          id?: string
          program_id?: string | null
          researcher_id?: string
          source?: string | null
          total_citations?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_metrics_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
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
          last_processed_at: string | null
          lattes_id: string | null
          lattes_xml_filename: string | null
          lattes_xml_path: string | null
          name: string
          orcid: string | null
          program_id: string
          research_line: string | null
          researcher_id_wos: string | null
          scopus_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: string
          last_processed_at?: string | null
          lattes_id?: string | null
          lattes_xml_filename?: string | null
          lattes_xml_path?: string | null
          name: string
          orcid?: string | null
          program_id: string
          research_line?: string | null
          researcher_id_wos?: string | null
          scopus_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          last_processed_at?: string | null
          lattes_id?: string | null
          lattes_xml_filename?: string | null
          lattes_xml_path?: string | null
          name?: string
          orcid?: string | null
          program_id?: string
          research_line?: string | null
          researcher_id_wos?: string | null
          scopus_id?: string | null
          updated_at?: string
          user_id?: string | null
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
          is_active: boolean
          journal_event: string
          program_id: string | null
          researcher_id: string
          source_origin: string
          type: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          journal_event: string
          program_id?: string | null
          researcher_id: string
          source_origin?: string
          type?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          journal_event?: string
          program_id?: string | null
          researcher_id?: string
          source_origin?: string
          type?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
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
          is_active: boolean
          program_id: string | null
          researcher_id: string
          source_origin: string
          title: string | null
          type: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          researcher_id: string
          source_origin?: string
          title?: string | null
          type: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          researcher_id?: string
          source_origin?: string
          title?: string | null
          type?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_productions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
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
