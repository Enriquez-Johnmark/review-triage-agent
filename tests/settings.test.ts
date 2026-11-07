import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { auditLog } from "../src/store/audit.ts"
import { openDb } from "../src/store/db.ts"
import { appIds, DEFAULT_SETTINGS, loadSettings, saveSettings } from "../src/store/settings.ts"

const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))

describe("settings", () => {
  it("start from the defaults and keep what a person changes, logged", () => {
    const db = openDb(":memory:")
    expect(loadSettings(db)).toEqual(DEFAULT_SETTINGS)

    saveSettings(db, clock, { googlePlayId: "com.example.wallet", supportChannel: "Help > Chat" }, "ana")

    expect(loadSettings(db)).toMatchObject({
      googlePlayId: "com.example.wallet",
      supportChannel: "Help > Chat",
    })
    expect(appIds(loadSettings(db))).toEqual(["com.example.wallet"])
    expect(auditLog(db).at(-1)).toMatchObject({ actor: "ana", action: "settings.changed" })
  })

  it("refuse values out of range and keep the old ones", () => {
    const db = openDb(":memory:")
    expect(() => saveSettings(db, clock, { threshold: 1.5 }, "ana")).toThrow()
    expect(() => saveSettings(db, clock, { appStoreId: "id123" }, "ana")).toThrow("number")
    expect(loadSettings(db)).toEqual(DEFAULT_SETTINGS)
  })
})
