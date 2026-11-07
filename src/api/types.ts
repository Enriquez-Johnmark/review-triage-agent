// The API's answers, as the dashboard reads them (web/ imports these types).

import type { VersionPoint, WeekBar } from "../core/charts.ts"
import type { Broken } from "../core/reply-rules.ts"
import type { Summary } from "../commands/summary.ts"
import type { ReviewEntry } from "../store/browse.ts"
import type { Draft } from "../store/drafts.ts"
import type { Settings } from "../store/settings.ts"

export type { Broken, Draft, ReviewEntry, Settings, Summary, VersionPoint, WeekBar }

export interface CauseName {
  id: string
  label: string
}

export interface OverviewAnswer {
  summary: Summary
  causesByWeek: WeekBar[]
  crashShareByVersion: VersionPoint[]
  causes: CauseName[]
}

export interface ReviewAnswer extends ReviewEntry {
  draft: Draft | null
  causes: CauseName[]
}

/** The settings, and whether the API key is set: never the key itself (F5). */
export interface SettingsAnswer extends Settings {
  apiKeySet: boolean
  /** Where approved replies go: "stub" (nothing is posted) or "google_play". */
  poster: string
}

export interface ErrorAnswer {
  error: string
}
