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
      proposal_survey_responses: {
        Row: {
          id: string
          proposal_id: string
          table_or_chair_preference: string | null
          preferred_gender: string | null
          office_address: string | null
          massage_space_name: string | null
          point_of_contact: string | null
          billing_contact: string | null
          coi_required: boolean | null
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          table_or_chair_preference?: string | null
          preferred_gender?: string | null
          office_address?: string | null
          massage_space_name?: string | null
          point_of_contact?: string | null
          billing_contact?: string | null
          coi_required?: boolean | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          table_or_chair_preference?: string | null
          preferred_gender?: string | null
          office_address?: string | null
          massage_space_name?: string | null
          point_of_contact?: string | null
          billing_contact?: string | null
          coi_required?: boolean | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
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