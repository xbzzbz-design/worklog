export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; daily_max: number; created_at: string }
        Insert: { id: string; name: string; daily_max?: number }
        Update: { name?: string; daily_max?: number }
      }
      clients: {
        Row: { id: string; name: string; archived: boolean; created_at: string }
        Insert: { name: string; archived?: boolean }
        Update: { name?: string; archived?: boolean }
      }
      entries: {
        Row: {
          id: string; user_id: string; client_id: string | null; date: string
          job_type: string; other_kind: string | null; quantity: number
          is_revision: boolean; parent_id: string | null; revision_round: number | null
          revision_severity: string | null; revision_cause: string | null
          motion_scenes: number; condition_brief_incomplete: boolean
          condition_asset_not_provided: boolean; condition_deadline_rush: boolean
          calculated_units: number; manual_override: number | null
          manual_override_reason: string | null; note: string | null
          drive_link: string | null; snap_image_path: string | null
          is_flagged: boolean; flag_note: string | null; is_starred: boolean
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['entries']['Insert']>
      }
      holidays: {
        Row: { id: string; date: string; name: string; created_at: string }
        Insert: { date: string; name: string }
        Update: { date?: string; name?: string }
      }
      leave: {
        Row: { id: string; user_id: string; date: string; type: string; created_at: string }
        Insert: { user_id: string; date: string; type: string }
        Update: { type?: string }
      }
      help_requests: {
        Row: {
          id: string; author_id: string; description: string; urgency: string
          hours_needed: number | null; status: string; handled_by: string | null
          thanks_message: string | null; resolved_at: string | null; created_at: string
        }
        Insert: { author_id: string; description: string; urgency: string; hours_needed?: number | null }
        Update: { status?: string; handled_by?: string | null; thanks_message?: string | null; resolved_at?: string | null }
      }
      team_settings: {
        Row: { id: number; workdays: number[]; holiday_addon: number; updated_at: string }
        Insert: { workdays?: number[]; holiday_addon?: number }
        Update: { workdays?: number[]; holiday_addon?: number }
      }
    }
  }
}
