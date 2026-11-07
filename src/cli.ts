// The commands:
//   pnpm cli fetch --play com.example.app --apple 123456789   new reviews of an app
//   pnpm cli load-sample                                       the made-up reviews, for the demo
//   pnpm cli sort --app com.example.app                        sort new reviews with Claude (needs the API key)
//   pnpm cli summary --play com.example.app --apple 123456789  this week's numbers and the spikes
//   pnpm cli draft --play com.example.app                      draft replies for the queue (needs the API key)
//   pnpm cli drafts --play com.example.app                     the replies and their rule checks
//   pnpm cli write --review google_play:ID --text "..." --by ana   write or edit a reply by hand
//   pnpm cli approve --draft 3 --by ana                        approve the exact text of a reply
//   pnpm cli refuse --draft 3 --by ana --reason "..."          refuse a reply
//   pnpm cli post --draft 3 --by ana                           post an approved reply (the stand-in unless
//                                                              GOOGLE_PLAY_CREDENTIALS is set)
//   pnpm cli eval                                              score the recorded answers on the labelled set
//   pnpm cli eval --record                                     ask Claude, and record its answers (needs the API key)

import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { parseArgs } from "node:util"

import { systemClock } from "./clock.ts"
import { evaluate, formatReport, loadLabelled } from "./commands/eval.ts"
import { fetchNew } from "./commands/fetch.ts"
import { draftWaiting, type ReplySettings } from "./commands/draft.ts"
import { postReply } from "./commands/post.ts"
import { approveReply, refuseReply, writeReply } from "./commands/replies.ts"
import { sortPending } from "./commands/sort.ts"
import { formatSummary, summarise } from "./commands/summary.ts"
import { FINANCE_CAUSES } from "./core/causes.ts"
import { parseThreshold } from "./core/label.ts"
import { fetchAppStore } from "./fetch/appStore.ts"
import { fetchGooglePlay } from "./fetch/googlePlay.ts"
import { ClaudeSorter, sortQuestion } from "./model/claude.ts"
import { ClaudeDrafter } from "./model/claudeDrafter.ts"
import { loadRecordings, RecordedSorter, RecordingSorter } from "./model/recorded.ts"
import { choosePoster } from "./post/googlePlay.ts"
import { sampleReviews } from "./samples.ts"
import { openDb } from "./store/db.ts"
import { listDrafts } from "./store/drafts.ts"
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
    limit: { type: "string", default: "10" },
    draft: { type: "string" },
    review: { type: "string" },
    text: { type: "string" },
    by: { type: "string" },
    reason: { type: "string", default: "" },
    support: { type: "string" },
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

function drafter(): ClaudeDrafter {
  if (!process.env.ANTHROPIC_API_KEY) fail("put your Anthropic API key in .env as ANTHROPIC_API_KEY")
  return new ClaudeDrafter()
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

/** The support channel every reply ends with: `--support`, or SUPPORT_CHANNEL in .env. */
function replySettings(): ReplySettings {
  const supportChannel = (values.support ?? process.env.SUPPORT_CHANNEL ?? "").trim()
  if (supportChannel === "") fail("set the support channel: --support or SUPPORT_CHANNEL in .env")
  return { causes: FINANCE_CAUSES, supportChannel }
}

function draftId(): number {
  const id = Number(values.draft)
  if (!Number.isInteger(id) || id <= 0) fail("give --draft with the draft's number (see `drafts`)")
  return id
}

function storeIds(): string[] {
  const ids = [values.play, values.apple].filter((id) => id !== undefined)
  if (ids.length === 0) fail("give --play and/or --apple with the app's store IDs")
  return ids
}

let threshold: number
try {
  threshold = parseThreshold(values.threshold)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

const COMMANDS = [
  "fetch",
  "load-sample",
  "sort",
  "summary",
  "draft",
  "drafts",
  "write",
  "approve",
  "refuse",
  "post",
  "eval",
]
const command = positionals[0] ?? ""
if (!COMMANDS.includes(command)) {
  console.error(`commands: ${COMMANDS.join(", ")}`)
  process.exit(1)
}

mkdirSync(dirname(values.db), { recursive: true })
const db = openDb(values.db)

// A refusal (not approved, breaks a rule…) is said plainly, without a stack trace.
try {
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
      console.log(formatSummary(summarise(db, systemClock, storeIds(), FINANCE_CAUSES), FINANCE_CAUSES))
      break
    }
    case "draft": {
      const limit = Number(values.limit)
      if (!Number.isInteger(limit) || limit <= 0) fail("--limit must be a whole number above 0")
      const report = await draftWaiting(db, systemClock, drafter(), replySettings(), storeIds(), limit)
      console.log(
        `${String(report.ready)} ready for a person, ${String(report.flagged)} flagged for a person to write, ${String(report.failed)} failed (tried again next run)`,
      )
      break
    }
    case "drafts": {
      for (const draft of listDrafts(db, storeIds())) {
        console.log(
          `#${String(draft.id)} ${draft.status} (${draft.review.store} ${draft.review.storeReviewId})`,
        )
        console.log(`  ${draft.text.replaceAll("\n", "\n  ")}`)
        for (const broken of draft.broken) console.log(`  ! ${broken.detail}`)
      }
      break
    }
    case "write": {
      const [store, ...id] = (values.review ?? "").split(":")
      if ((store !== "google_play" && store !== "app_store") || id.length === 0)
        fail("give --review as store:ID, like google_play:gp-123")
      if (values.text === undefined) fail("give --text with the reply")
      const draft = writeReply(
        db,
        systemClock,
        { store, storeReviewId: id.join(":") },
        values.text,
        values.by ?? "",
        replySettings(),
      )
      console.log(
        `#${String(draft.id)} ${draft.status}${draft.broken.map((broken) => `; ${broken.detail}`).join("")}`,
      )
      break
    }
    case "approve": {
      const draft = approveReply(db, systemClock, draftId(), values.by ?? "", replySettings())
      console.log(`#${String(draft.id)} approved by ${draft.approvedBy ?? ""}`)
      break
    }
    case "refuse": {
      const draft = refuseReply(db, systemClock, draftId(), values.by ?? "", values.reason)
      console.log(`#${String(draft.id)} refused`)
      break
    }
    case "post": {
      const poster = choosePoster(process.env, db, systemClock)
      const posted = await postReply(db, systemClock, poster, draftId(), values.by ?? "")
      console.log(
        posted.kind === "posted"
          ? `posted through ${poster.name} (${posted.key})`
          : `already posted (${posted.key})`,
      )
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
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
