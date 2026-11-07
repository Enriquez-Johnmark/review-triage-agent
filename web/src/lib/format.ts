import type { CauseName } from "@/api/types"

export const percent = (share: number) => `${Math.round(share * 100)}%`

/** A review's date, in Manila time like the weeks. */
export const shortDate = (at: string) =>
  new Date(at).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

/** A week's Monday (`YYYY-MM-DD`) as "Nov 2". */
export const weekLabel = (week: string) =>
  new Date(`${week}T00:00:00Z`).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })

export const causeName = (causes: readonly CauseName[], id: string | null | undefined) =>
  id ? (causes.find((cause) => cause.id === id)?.label ?? id) : "Needs a person"

export const stars = (count: number) => "★".repeat(count) + "☆".repeat(5 - count)
