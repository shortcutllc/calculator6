export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      proposals: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_name: string
          data: Json
          customization: Json
          is_editable: boolean
          user_id: string
          status: string
          pending_review: boolean
          has_changes: boolean
          original_data: Json | null
          change_source: string
          client_email: string | null
          client_logo_url: string | null
          notes: string | null
          // New pricing options fields
          pricing_options: Json
          selected_options: Json
          has_pricing_options: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_name: string
          data?: Json
          customization?: Json
          is_editable?: boolean
          user_id: string
          status?: string
          pending_review?: boolean
          has_changes?: boolean
          original_data?: Json | null
          change_source?: string
          client_email?: string | null
          client_logo_url?: string | null
          notes?: string | null
          // New pricing options fields
          pricing_options?: Json
          selected_options?: Json
          has_pricing_options?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_name?: string
          data?: Json
          customization?: Json
          is_editable?: boolean
          user_id?: string
          status?: string
          pending_review?: boolean
          has_changes?: boolean
          original_data?: Json | null
          change_source?: string
          client_email?: string | null
          client_logo_url?: string | null
          notes?: string | null
          // New pricing options fields
          pricing_options?: Json
          selected_options?: Json
          has_pricing_options?: boolean
        }
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
  }
}