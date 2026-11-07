// A dashboard server over made-up reviews, for the API tests.

import { buildServer } from "../../src/api/server.ts"
import type { Drafter } from "../../src/model/drafter.ts"
import type { Sorter } from "../../src/model/sorter.ts"
import { StubPoster } from "../../src/post/stub.ts"
import { saveSettings } from "../../src/store/settings.ts"
import { SUPPORT, world } from "./replies.ts"

export async function server(models: { sorter?: Sorter; drafter?: Drafter } = {}) {
  const w = world()
  saveSettings(w.db, w.clock, { googlePlayId: "com.example.wallet", supportChannel: SUPPORT }, "ana")
  const app = await buildServer({
    db: w.db,
    clock: w.clock,
    sorter: models.sorter,
    drafter: models.drafter,
    poster: new StubPoster(w.db, w.clock),
    fetchers: {
      googlePlay: () => Promise.resolve({ reviews: [], skipped: 0 }),
      appStore: () => Promise.resolve({ reviews: [], skipped: 0 }),
    },
  })
  return { ...w, app }
}
