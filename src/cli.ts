// The commands:
//   pnpm cli fetch --play com.example.app --apple 123456789   new reviews of an app
//   pnpm cli load-sample                                       the made-up reviews, for the demo
//   pnpm cli sort --app com.example.app                        sort new reviews with Claude (needs the API key)
//   pnpm cli summary --play com.example.app --apple 123456789  this week's numbers and the spikes
//   pnpm cli eval                                              score the recorded answers on the labelled set
//   pnpm cli eval --record                                     ask Claude, and record its answers (needs the API key)

import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { parseArgs } from "node:util"

import { systemClock } from "./clock.ts"
import { evaluate, formatReport, loadLabelled } from "./commands/eval.ts"
import { fetchNew } from "./commands/fetch.ts"
import { sortPending } from "./commands/sort.ts"
import { formatSummary, summarise } from "./commands/summary.ts"
import { FINANCE_CAUSES } from "./core/causes.ts"
import { parseThreshold } from "./core/label.ts"
import { fetchAppStore } from "./fetch/appStore.ts"
import { fetchGooglePlay } from "./fetch/googlePlay.ts"
import { ClaudeSorter, sortQuestion } from "./model/claude.ts"
import { loadRecordings, RecordedSorter, RecordingSorter } from "./model/recorded.ts"
import { sampleReviews } from "./samples.ts"
import { openDb } from "./store/db.ts"
import { saveReviews } from "./store/reviews.ts"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    db: { type: "string", default: "data/reviews.db" },
    play: { type: "string" },
    apple: { type: "string" },
    app: { type: "string" },
    record: { type: "boolean", default: false },
    threshold: { type: "string", default: "0.6" },
  },
})

// The owner's API key, kept out of git in `.env` (never a Claude subscription).
if (existsSync(".env")) process.loadEnvFile(".env")

const RECORDINGS = "samples/recorded-labels.json"

/** Claude through the owner's API key only: no other credential is used. */
function claude(): ClaudeSorter {
  if (!process.env.ANTHROPIC_API_KEY) fail("put your Anthropic API key in .env as ANTHROPIC_API_KEY")
  return new ClaudeSorter()
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

let threshold: number
try {
  threshold = parseThreshold(values.threshold)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

const COMMANDS = ["fetch", "load-sample", "sort", "summary", "eval"]
const command = positionals[0] ?? ""
if (!COMMANDS.includes(command)) {
  console.error(`commands: ${COMMANDS.join(", ")}`)
  process.exit(1)
}

mkdirSync(dirname(values.db), { recursive: true })
const db = openDb(values.db)

switch (command) {
  case "fetch": {
    if (!values.play && !values.apple) fail("give --play and/or --apple with the app's store ID")
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
    for (const failure of saved.failed) console.error(`Failed: ${failure}`)
    if (saved.failed.length > 0) process.exitCode = 1
    break
  }
  case "sort": {
    if (!values.app) fail("give --app with the app's ID")
    const report = await sortPending(db, systemClock, claude(), {
      appId: values.app,
      causes: FINANCE_CAUSES,
      threshold,
    })
    console.log(
      `${String(report.sorted)} sorted, ${String(report.needsPerson)} for a person, ${String(report.failed)} failed (tried again next run)`,
    )
    break
  }
  case "summary": {
    const appIds = [values.play, values.apple].filter((id) => id !== undefined)
    if (appIds.length === 0) fail("give --play and/or --apple with the app's store IDs")
    console.log(formatSummary(summarise(db, systemClock, appIds, FINANCE_CAUSES), FINANCE_CAUSES))
    break
  }
  case "eval": {
    const recordings = loadRecordings(RECORDINGS)
    const sorter = values.record
      ? new RecordingSorter(claude(), RECORDINGS)
      : recordings && new RecordedSorter(recordings, sortQuestion)
    if (!sorter) fail("no recorded answers yet: run `pnpm cli eval --record` with your API key in .env")
    const report = await evaluate(loadLabelled("samples/labelled.json"), sorter, FINANCE_CAUSES, threshold)
    console.log(formatReport(report))
    break
  }
  case "load-sample": {
    const saved = saveReviews(db, systemClock, sampleReviews())
    console.log(`${String(saved.added)} sample reviews loaded, ${String(saved.alreadyThere)} already there`)
    break
  }
}
