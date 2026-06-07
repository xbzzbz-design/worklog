import type { JobType, RevisionSeverity, RevisionCause } from './types'
import { JOB_TYPES, SEVERITY_RATES } from './types'

export interface FormulaInput {
  jobType: JobType
  quantity: number
  isRevision: boolean
  revisionSeverity?: RevisionSeverity | null
  revisionCause?: RevisionCause | null
  motionScenes?: number
  conditionBriefIncomplete?: boolean
  conditionAssetNotProvided?: boolean
  conditionDeadlineRush?: boolean
  addOnAmount?: number
}

export interface FormulaResult {
  baseUnits: number
  motionUnits: number
  addOnUnits: number
  total: number
  breakdown: string
}

export function calcUnits(input: FormulaInput): FormulaResult {
  const { jobType, quantity, isRevision, revisionSeverity, revisionCause,
    motionScenes = 0, conditionBriefIncomplete = false,
    conditionAssetNotProvided = false, conditionDeadlineRush = false,
    addOnAmount = 0.5 } = input

  const rate = JOB_TYPES[jobType].rate
  let baseUnits = 0

  if (!isRevision) {
    baseUnits = rate * quantity
  } else {
    if (revisionCause === 'OUR_MISTAKE') {
      baseUnits = 0
    } else if (revisionSeverity === 'MAJOR') {
      baseUnits = rate * quantity
    } else if (revisionSeverity === 'STANDARD') {
      baseUnits = SEVERITY_RATES.STANDARD * quantity
    } else {
      baseUnits = SEVERITY_RATES.MINOR * quantity
    }
  }

  const motionUnits = motionScenes * 1.0

  // Don't double-count: if revisionCause is BRIEF_INCOMPLETE, skip that condition
  const briefApplies = conditionBriefIncomplete && revisionCause !== 'BRIEF_INCOMPLETE'
  const addOnUnits =
    (briefApplies ? addOnAmount : 0) +
    (conditionAssetNotProvided ? addOnAmount : 0) +
    (conditionDeadlineRush ? addOnAmount : 0)

  const total = baseUnits + motionUnits + addOnUnits

  const parts: string[] = []
  const jt = JOB_TYPES[jobType]
  if (baseUnits > 0) parts.push(`${jt.short} ×${quantity} = ${baseUnits.toFixed(2)}`)
  else if (isRevision && revisionCause === 'OUR_MISTAKE') parts.push('Our mistake = 0.00')
  if (motionUnits > 0) parts.push(`Motion ×${motionScenes} = ${motionUnits.toFixed(2)}`)
  if (addOnUnits > 0) parts.push(`Add-ons = ${addOnUnits.toFixed(2)}`)

  return { baseUnits, motionUnits, addOnUnits, total, breakdown: parts.join(' | ') }
}
