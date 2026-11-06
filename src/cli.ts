// The commands: `fetch` new reviews, or `load-sample` for the demo.
//   pnpm cli fetch --play com.example.app --apple 123456789
//   pnpm cli load-sample

import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { parseArgs } from "node:util"

import { systemClock } from "./clock.ts"
import { fetchNew } from "./commands/fetch.ts"
import { fetchAppStore } from "./fetch/appStore.ts"
import { fetchGooglePlay } from "./fetch/googlePlay.ts"
import { sampleReviews } from "./samples.ts"
import { openDb } from "./store/db.ts"
import { saveReviews } from "./store/reviews.ts"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    db: { type: "string", default: "data/reviews.db" },
    play: { type: "string" },
    apple: { type: "string" },
  },
})

mkdirSync(dirname(values.db), { recursive: true })
const db = openDb(values.db)

switch (positionals[0]) {
  case "fetch": {
    if (!values.play && !values.apple) throw new Error("give --play and/or --apple with the app's store ID")
    const saved = await fetchNew(
      db,
      systemClock,
      {
        ...(values.play ? { googlePlay: values.play } : {}),
        ...(values.apple ? { appStore: values.apple } : {}),
      },
      { googlePlay: (id) => fetchGooglePlay(id), appStore: (id) => fetchAppStore(id) },
    )
    console.log(
      `${String(saved.added)} new reviews, ${String(saved.alreadyThere)} already there, ${String(saved.skipped)} unreadable`,
    )
    break
  }
  case "load-sample": {
    const saved = saveReviews(db, systemClock, sampleReviews())
    console.log(`${String(saved.added)} sample reviews loaded, ${String(saved.alreadyThere)} already there`)
    break
  }
  default:
    console.error("commands: fetch, load-sample")
    process.exitCode = 1
}
