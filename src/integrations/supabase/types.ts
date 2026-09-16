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
      emergency_cards: {
        Row: {
          allergies: string[]
          blood_group: string
          card_id: string
          conditions: string[]
          contacts: Json
          edit_token_hash: string
          holder_name: string
          medications: string[]
          phone: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string[]
          blood_group?: string
          card_id: string
          conditions?: string[]
          contacts?: Json
          edit_token_hash?: string
          holder_name?: string
          medications?: string[]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string[]
          blood_group?: string
          card_id?: string
          conditions?: string[]
          contacts?: Json
          edit_token_hash?: string
          holder_name?: string
          medications?: string[]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_documents: {
        Row: {
          card_id: string
          created_at: string
          doc_type: string
          id: string
          name: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          card_id: string
          created_at?: string
          doc_type: string
          id?: string
          name: string
          size_bytes?: number
          storage_path: string
        }
        Update: {
          card_id?: string
          created_at?: string
          doc_type?: string
          id?: string
          name?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_documents_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      blood_donors: {
        Row: {
          active: boolean
          blood_group: string
          card_id: string
          city: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          blood_group: string
          card_id: string
          city: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          blood_group?: string
          card_id?: string
          city?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_donors_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      blood_requests: {
        Row: {
          blood_group: string
          card_id: string
          city: string
          created_at: string
          hospital: string | null
          id: string
          notes: string | null
          requester_name: string
          status: string
        }
        Insert: {
          blood_group: string
          card_id: string
          city: string
          created_at?: string
          hospital?: string | null
          id?: string
          notes?: string | null
          requester_name: string
          status?: string
        }
        Update: {
          blood_group?: string
          card_id?: string
          city?: string
          created_at?: string
          hospital?: string | null
          id?: string
          notes?: string | null
          requester_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      family_circles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          card_id: string
          circle_id: string
          created_at: string
          id: string
          invited_by_card_id: string
          relation: string
          responded_at: string | null
          status: string
        }
        Insert: {
          card_id: string
          circle_id: string
          created_at?: string
          id?: string
          invited_by_card_id: string
          relation?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          card_id?: string
          circle_id?: string
          created_at?: string
          id?: string
          invited_by_card_id?: string
          relation?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "family_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      family_alerts: {
        Row: {
          card_id: string
          circle_id: string
          created_at: string
          id: string
          message: string
          type: string
        }
        Insert: {
          card_id: string
          circle_id: string
          created_at?: string
          id?: string
          message?: string
          type: string
        }
        Update: {
          card_id?: string
          circle_id?: string
          created_at?: string
          id?: string
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_alerts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "family_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_alerts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      safety_checkins: {
        Row: {
          card_id: string
          enabled: boolean
          interval_minutes: number
          last_confirmed_at: string | null
          updated_at: string
        }
        Insert: {
          card_id: string
          enabled?: boolean
          interval_minutes?: number
          last_confirmed_at?: string | null
          updated_at?: string
        }
        Update: {
          card_id?: string
          enabled?: boolean
          interval_minutes?: number
          last_confirmed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_checkins_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      saved_hospitals: {
        Row: {
          address: string
          card_id: string
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
        }
        Insert: {
          address?: string
          card_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
        }
        Update: {
          address?: string
          card_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_hospitals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
      doctor_shares: {
        Row: {
          card_id: string
          created_at: string
          document_ids: string[]
          expires_at: string
          id: string
          include_allergies: boolean
          include_conditions: boolean
          include_contacts: boolean
          include_medications: boolean
          label: string
          revoked: boolean
        }
        Insert: {
          card_id: string
          created_at?: string
          document_ids?: string[]
          expires_at: string
          id?: string
          include_allergies?: boolean
          include_conditions?: boolean
          include_contacts?: boolean
          include_medications?: boolean
          label?: string
          revoked?: boolean
        }
        Update: {
          card_id?: string
          created_at?: string
          document_ids?: string[]
          expires_at?: string
          id?: string
          include_allergies?: boolean
          include_conditions?: boolean
          include_contacts?: boolean
          include_medications?: boolean
          label?: string
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "doctor_shares_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "emergency_cards"
            referencedColumns: ["card_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
