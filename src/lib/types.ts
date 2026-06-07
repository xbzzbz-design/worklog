export type JobType = 'VARIATION_TEXT' | 'VARIATION_SWAP' | 'ADAPTATION' | 'SINGLE_BANNER' | 'INFOGRAPHIC' | 'OTHER'
export type OtherKind = 'MEETING' | 'ADVISORY' | 'ADMIN' | 'OTHER'
export type RevisionSeverity = 'MINOR' | 'STANDARD' | 'MAJOR'
export type RevisionCause = 'CLIENT_CHANGED' | 'BRIEF_INCOMPLETE' | 'SCOPE_CREEP' | 'OUR_MISTAKE'
export type LeaveType = 'sick' | 'vacation'
export type HelpStatus = 'open' | 'claimed' | 'resolved'
export type HelpUrgency = 'low' | 'medium' | 'high'

export interface AppUser {
  id: string
  name: string
  daily_max: number
  created_at: string
}

export interface Client {
  id: string
  name: string
  archived: boolean
  created_at: string
}

export interface Entry {
  id: string
  user_id: string
  client_id: string | null
  date: string
  job_type: JobType
  other_kind: OtherKind | null
  quantity: number
  is_revision: boolean
  parent_id: string | null
  revision_round: number | null
  revision_severity: RevisionSeverity | null
  revision_cause: RevisionCause | null
  motion_scenes: number
  condition_brief_incomplete: boolean
  condition_asset_not_provided: boolean
  condition_deadline_rush: boolean
  calculated_units: number
  manual_override: number | null
  manual_override_reason: string | null
  note: string | null
  drive_link: string | null
  snap_image_path: string | null
  is_flagged: boolean
  flag_note: string | null
  is_starred: boolean
  created_at: string
  updated_at: string
  // joined
  client?: Client
  user?: AppUser
}

export interface Holiday {
  id: string
  date: string
  name: string
}

export interface Leave {
  id: string
  user_id: string
  date: string
  type: LeaveType
}

export interface HelpRequest {
  id: string
  author_id: string
  description: string
  urgency: HelpUrgency
  hours_needed: number | null
  status: HelpStatus
  handled_by: string | null
  thanks_message: string | null
  resolved_at: string | null
  created_at: string
  author?: AppUser
  handler?: AppUser
}

export interface TeamSettings {
  id: number
  workdays: number[]
  holiday_addon: number
  updated_at: string
}

export const JOB_TYPES: Record<JobType, { label: string; short: string; rate: number; icon: string; timeBased?: boolean }> = {
  VARIATION_TEXT: { label: 'Variation · Text/Color', short: 'Var·Text', rate: 0.25, icon: 'Type' },
  VARIATION_SWAP: { label: 'Variation · Image Swap', short: 'Var·Swap', rate: 0.50, icon: 'Image' },
  ADAPTATION:     { label: 'Adaptation', short: 'Adaptation', rate: 0.50, icon: 'Maximize2' },
  SINGLE_BANNER:  { label: 'Single Banner', short: 'Banner', rate: 1.00, icon: 'RectangleHorizontal' },
  INFOGRAPHIC:    { label: 'Infographic', short: 'Infographic', rate: 2.00, icon: 'BarChart3' },
  OTHER:          { label: 'Meeting / Other', short: 'Meeting', rate: 1.00, icon: 'Users', timeBased: true },
}

export const OTHER_KINDS: Record<OtherKind, { label: string }> = {
  MEETING:  { label: 'Meeting' },
  ADVISORY: { label: 'Advising / covering' },
  ADMIN:    { label: 'Admin / coordination' },
  OTHER:    { label: 'Other' },
}

export const SEVERITY_RATES: Record<RevisionSeverity, number> = {
  MINOR: 0.25,
  STANDARD: 0.50,
  MAJOR: -1, // same as job type rate
}
