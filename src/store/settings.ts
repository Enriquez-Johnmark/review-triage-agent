import { z } from "zod"

import type { Clock } from "../clock.ts"
import { audit } from "./audit.ts"
import type { Db } from "./db.ts"

/** What the settings page sets (spec, Round 2). The API key is never one of
 *  them: it lives only in `.env` (F5). */
export const Settings = z
  .object({
    /** The app's Google Play package name, like com.example.app. */
    googlePlayId: z.string().trim().min(1).max(200).nullable(),
    /** The app's App Store number, like 123456789. */
    appStoreId: z
      .string()
      .trim()
      .regex(/^\d{1,15}$/, "the App Store ID is the app's number")
      .nullable(),
    /** Every reply ends with it (D1). */
    supportChannel: z.string().trim().max(150),
    /** Below this confidence a review goes to a person (B2). */
    threshold: z.number().min(0).max(1),
  })
  .strict()
export type Settings = z.infer<typeof Settings>

export const DEFAULT_SETTINGS: Settings = {
  googlePlayId: null,
  appStoreId: null,
  supportChannel: "",
  threshold: 0.6,
}

/** The settings, with the defaults for any not set yet. */
export function loadSettings(db: Db): Settings {
  const rows = db.prepare("select name, value from settings").all() as { name: string; value: string }[]
  const stored = Object.fromEntries(rows.map((row) => [row.name, JSON.parse(row.value) as unknown]))
  return Settings.parse({ ...DEFAULT_SETTINGS, ...stored })
}

/** Saves the settings a person changed, and logs the change. */
export function saveSettings(
  db: Db,
  clock: Clock,
  change: { [Name in keyof Settings]?: Settings[Name] | undefined },
  by: string,
): Settings {
  const changed = Object.fromEntries(Object.entries(change).filter(([, value]) => value !== undefined))
  const next = Settings.parse({ ...loadSettings(db), ...changed })
  db.transaction(() => {
    const save = db.prepare(
      "insert into settings (name, value) values (?, ?) on conflict (name) do update set value = excluded.value",
    )
    for (const name of Object.keys(changed) as (keyof Settings)[]) save.run(name, JSON.stringify(next[name]))
    audit(db, clock, {
      actor: by,
      action: "settings.changed",
      subject: "settings",
      details: { changed: Object.keys(changed) },
    })
  })()
  return next
}

/** The app's store IDs, for the queries that cover both stores. */
export function appIds(settings: Settings): string[] {
  return [settings.googlePlayId, settings.appStoreId].filter((id): id is string => id !== null)
}
