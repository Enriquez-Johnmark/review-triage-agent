// The commands (the app's store IDs, support channel and threshold come from
// the settings page unless given with --play, --apple, --support, --threshold):
//   pnpm cli fetch --play com.example.app --apple 123456789   new reviews of an app
//   pnpm cli load-sample                                       the made-up reviews, for the demo
//   pnpm cli load-demo                                         120 made-up reviews, sorted, with spikes (no key needed)
//   pnpm cli sort                                              sort new reviews with Claude (needs the API key)
//   pnpm cli summary --play com.example.app --apple 123456789  this week's numbers and the spikes
//   pnpm cli draft --play com.example.app                      draft replies for the queue (needs the API key)
//   pnpm cli drafts --play com.example.app                     the replies and their rule checks
//   pnpm cli write --review google_play:ID --text "..." --by ana   write or edit a reply by hand
//   pnpm cli approve --draft 3 --by ana                        approve the exact text of a reply
//   pnpm cli refuse --draft 3 --by ana --reason "..."          refuse a reply
//   pnpm cli post --draft 3 --by ana                           post an approved reply (the stand-in unless
//                                                              GOOGLE_PLAY_CREDENTIALS is set)
//   pnpm cli serve                                             the dashboard, at http://127.0.0.1:4317
//   pnpm cli mcp                                               the MCP server, over stdio, for Claude
//   pnpm cli eval                                              score the recorded answers on the labelled set
//   pnpm cli eval --record                                     ask Claude, and record its answers (needs the API key)

import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { parseArgs } from "node:util"

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { buildServer } from "./api/server.ts"
import { buildSummaryServer } from "./api/summaryServer.ts"
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
import { loadDemo } from "./demo.ts"
import { buildMcpServer } from "./mcp/server.ts"
import { sampleReviews } from "./samples.ts"
import { openDb } from "./store/db.ts"
import { listDrafts } from "./store/drafts.ts"
import { saveReviews } from "./store/reviews.ts"
import { loadSettings } from "./store/settings.ts"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    db: { type: "string", default: "data/reviews.db" },
    play: { type: "string" },
    apple: { type: "string" },
    app: { type: "string" },
    record: { type: "boolean", default: false },
    threshold: { type: "string" },
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

// Each setting comes from its flag when given, else from what the settings
// page saved, so the commands and the dashboard agree.

/** The support channel every reply ends with: `--support`, SUPPORT_CHANNEL
 *  in .env, or the settings page's. */
function replySettings(): ReplySettings {
  const supportChannel = (
    values.support ??
    process.env.SUPPORT_CHANNEL ??
    loadSettings(db).supportChannel
  ).trim()
  if (supportChannel === "") fail("set the support channel on the settings page, or give --support")
  return { causes: FINANCE_CAUSES, supportChannel }
}

/** Below it, a review goes to a person: `--threshold`, or the settings page's. */
function threshold(): number {
  if (values.threshold === undefined) return loadSettings(db).threshold
  try {
    return parseThreshold(values.threshold)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

/** The app's store IDs: `--play` and `--apple`, or the settings page's. */
function storeApp(): { googlePlay?: string; appStore?: string } {
  const settings = loadSettings(db)
  const googlePlay = values.play ?? (values.apple ? undefined : (settings.googlePlayId ?? undefined))
  const appStore = values.apple ?? (values.play ? undefined : (settings.appStoreId ?? undefined))
  if (!googlePlay && !appStore) fail("choose the app on the settings page, or give --play and/or --apple")
  return { ...(googlePlay ? { googlePlay } : {}), ...(appStore ? { appStore } : {}) }
}

function draftId(): number {
  const id = Number(values.draft)
  if (!Number.isInteger(id) || id <= 0) fail("give --draft with the draft's number (see `drafts`)")
  return id
}

function storeIds(): string[] {
  const app = storeApp()
  return [app.googlePlay, app.appStore].filter((id) => id !== undefined)
}

const COMMANDS = [
  "fetch",
  "load-sample",
  "load-demo",
  "sort",
  "summary",
  "draft",
  "drafts",
  "write",
  "approve",
  "refuse",
  "post",
  "serve",
  "mcp",
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
      const saved = await fetchNew(db, systemClock, storeApp(), {
        googlePlay: (id) => fetchGooglePlay(id),
        appStore: (id) => fetchAppStore(id),
      })
      console.log(
        `${String(saved.added)} new reviews, ${String(saved.alreadyThere)} already there, ${String(saved.skipped)} unreadable`,
      )
      for (const failure of saved.failed) console.error(`Failed: ${failure}`)
      if (saved.failed.length > 0) process.exitCode = 1
      break
    }
    case "sort": {
      const sorter = claude()
      const reports = []
      for (const appId of values.app ? [values.app] : storeIds())
        reports.push(
          await sortPending(db, systemClock, sorter, {
            appId,
            causes: FINANCE_CAUSES,
            threshold: threshold(),
          }),
        )
      const report = {
        sorted: reports.reduce((total, one) => total + one.sorted, 0),
        needsPerson: reports.reduce((total, one) => total + one.needsPerson, 0),
        failed: reports.reduce((total, one) => total + one.failed, 0),
      }
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
    case "serve": {
      const hasKey = Boolean(process.env.ANTHROPIC_API_KEY)
      const app = await buildServer({
        db,
        clock: systemClock,
        sorter: hasKey ? new ClaudeSorter() : undefined,
        drafter: hasKey ? new ClaudeDrafter() : undefined,
        poster: choosePoster(process.env, db, systemClock),
        fetchers: { googlePlay: (id) => fetchGooglePlay(id), appStore: (id) => fetchAppStore(id) },
        webDir: "web/dist",
      })
      const port = Number(process.env.PORT ?? 4317)
      // Only this computer can reach it: it is one person's local tool.
      await app.listen({ host: "127.0.0.1", port })
      console.log(
        `The dashboard is at http://127.0.0.1:${String(port)}${hasKey ? "" : " (no API key: sorting and drafting are off)"}`,
      )
      const token = process.env.SUMMARY_TOKEN?.trim()
      if (token) {
        const summary = buildSummaryServer({
          db,
          clock: systemClock,
          sorter: hasKey ? new ClaudeSorter() : undefined,
          fetchers: { googlePlay: (id) => fetchGooglePlay(id), appStore: (id) => fetchAppStore(id) },
          token,
        })
        const summaryPort = Number(process.env.SUMMARY_PORT ?? 4318)
        // n8n in Docker reaches it from outside this computer's loopback;
        // only the summary and a fetch are there, behind the token.
        await summary.listen({ host: process.env.SUMMARY_HOST ?? "0.0.0.0", port: summaryPort })
        console.log(`The summary for n8n is on port ${String(summaryPort)}, with SUMMARY_TOKEN`)
      }
      break
    }
    case "mcp": {
      // Stdio carries the protocol: nothing else may be printed.
      const server = buildMcpServer({
        db,
        clock: systemClock,
        drafter: process.env.ANTHROPIC_API_KEY ? new ClaudeDrafter() : undefined,
      })
      await server.connect(new StdioServerTransport())
      break
    }
    case "eval": {
      const recordings = loadRecordings(RECORDINGS)
      const sorter = values.record
        ? new RecordingSorter(claude(), RECORDINGS)
        : recordings && new RecordedSorter(recordings, sortQuestion)
      if (!sorter) fail("no recorded answers yet: run `pnpm cli eval --record` with your API key in .env")
      const report = await evaluate(
        loadLabelled("samples/labelled.json"),
        sorter,
        FINANCE_CAUSES,
        threshold(),
      )
      console.log(formatReport(report))
      break
    }
    case "load-demo": {
      const added = loadDemo(db, systemClock)
      console.log(`${String(added)} made-up reviews loaded, sorted, for app com.example.wallet`)
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
