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