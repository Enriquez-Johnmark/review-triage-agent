import { existsSync } from "node:fs"
import { resolve } from "node:path"

import fastifyStatic from "@fastify/static"
import Fastify, { type FastifyInstance } from "fastify"
import { z } from "zod"

import type { Clock } from "../clock.ts"
import { draftReply } from "../commands/draft.ts"
import { type Fetchers, fetchNew } from "../commands/fetch.ts"
import { postReply } from "../commands/post.ts"
import { approveReply, refuseReply, writeReply } from "../commands/replies.ts"
import { sortPending } from "../commands/sort.ts"
import { summarise } from "../commands/summary.ts"
import { causesByWeek, crashShareByVersion } from "../core/charts.ts"
import { type Cause, FINANCE_CAUSES } from "../core/causes.ts"
import { Store } from "../core/review.ts"
import type { Drafter } from "../model/drafter.ts"
import type { Sorter } from "../model/sorter.ts"
import type { Poster } from "../post/poster.ts"
import { findReviews } from "../store/browse.ts"
import type { Db } from "../store/db.ts"
import { draftFor } from "../store/drafts.ts"
import { setCauseByHand, type ReviewKey } from "../store/labels.ts"
import { replyQueue } from "../store/queue.ts"
import { summaryRows } from "../store/summary.ts"
import { appIds, loadSettings, saveSettings, Settings } from "../store/settings.ts"
import type { OverviewAnswer, ReviewAnswer, SettingsAnswer } from "./types.ts"

export interface ServerDeps {
  db: Db
  clock: Clock
  /** The model clients; absent when the API key isn't set. */
  sorter: Sorter | undefined
  drafter: Drafter | undefined
  poster: Poster
  fetchers: Fetchers
  /** The built dashboard, served at `/`, if it is there. */
  webDir?: string
}

/** A refusal the person can act on: shown as it is. */
class Refused extends Error {}

const By = z.string().trim().min(1, "say who you are").max(80)
const ReviewParams = z.object({ store: Store, id: z.string().min(1).max(300) }).strict()
const DraftParams = z.object({ id: z.coerce.number().int().positive() }).strict()

/** The dashboard's API (spec, Round 2). It serves only what the pages show
 *  and acts only through the same functions as the commands, so every rule
 *  holds here too. The API key is never in an answer or a log (F5). */
export async function buildServer(deps: ServerDeps): Promise<FastifyInstance> {
  const { db, clock } = deps
  const causes: readonly Cause[] = FINANCE_CAUSES
  const causeNames = causes.map(({ id, label }) => ({ id, label }))
  const app = Fastify({ logger: false })

  // Changes come only from this dashboard: another site open in the same
  // browser can't post a reply through it.
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "GET" || request.method === "HEAD") return
    const origin = request.headers.origin
    if (origin !== undefined && new URL(origin).host !== request.headers.host)
      return reply.code(403).send({ error: "changes come only from this dashboard" })
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError)
      return reply.code(400).send({ error: error.issues.map((issue) => issue.message).join("; ") })
    if (error instanceof Refused) return reply.code(400).send({ error: error.message })
    // Anything else may carry what it shouldn't (an SDK's error can quote a
    // request), so only a plain message goes out.
    const code = (error as { statusCode?: number }).statusCode
    if (code !== undefined && code >= 400 && code < 500)
      return reply.code(code).send({ error: "bad request" })
    return reply.code(500).send({ error: "something went wrong; see the command line for details" })
  })

  /** Runs one of the app's own functions. Its refusals are plain `Error`s
   *  ("isn't approved", "breaks the rules") and are shown as they are; any
   *  other error (the model client's, the database's) is not. */
  const act = async <T>(work: () => T | Promise<T>): Promise<T> => {
    try {
      return await work()
    } catch (error) {
      if (error instanceof Error && error.constructor === Error) throw new Refused(error.message)
      throw error
    }
  }
  const ids = () => appIds(loadSettings(db))

  app.get("/api/overview", (): OverviewAnswer => {
    const rows = summaryRows(db, ids())
    const sorted = rows.flatMap((row) => (row.cause === null ? [] : [{ ...row, cause: row.cause }]))
    return {
      summary: summarise(db, clock, ids(), causes),
      causesByWeek: causesByWeek(sorted, clock.now()),
      crashShareByVersion: crashShareByVersion(
        sorted.flatMap((row) =>
          row.appVersion === null ? [] : [{ appVersion: row.appVersion, cause: row.cause }],
        ),
      ),
      causes: causeNames,
    }
  })

  app.get("/api/summary", () => summarise(db, clock, ids(), causes))

  app.get("/api/queue", () =>
    replyQueue(db, ids()).map((entry) => ({
      ...entry,
      draftStatus: draftFor(db, entry.review)?.status ?? null,
    })),
  )

  app.get("/api/reviews", (request) => {
    const query = z
      .object({
        cause: z.string().max(50).optional(),
        week: z.iso.date().optional(),
        version: z.string().max(50).optional(),
      })
      .strict()
      .parse(request.query)
    return findReviews(db, ids(), {
      cause: query.cause,
      week: query.week,
      appVersion: query.version,
      limit: 200,
    })
  })

  app.get("/api/reviews/:store/:id", (request, reply): ReviewAnswer | undefined => {
    const key = reviewKey(request.params)
    const found = findOne(db, key)
    if (!found) {
      void reply.code(404).send({ error: "no such review" })
      return undefined
    }
    return { ...found, draft: draftFor(db, key) ?? null, causes: causeNames }
  })

  app.post("/api/reviews/:store/:id/cause", (request) => {
    const key = reviewKey(request.params)
    const body = z.object({ cause: z.string(), by: By }).strict().parse(request.body)
    return act(() => {
      setCauseByHand(
        db,
        clock,
        key,
        body.cause,
        causes.map((cause) => cause.id),
        body.by,
      )
      return findOne(db, key)
    })
  })

  app.post("/api/reviews/:store/:id/draft", (request) => {
    const key = reviewKey(request.params)
    const drafter = deps.drafter
    if (!drafter) throw new Refused("set ANTHROPIC_API_KEY in .env to draft replies with Claude")
    return act(() => draftReply(db, clock, drafter, replySettings(), key))
  })

  app.put("/api/reviews/:store/:id/reply", (request) => {
    const key = reviewKey(request.params)
    const body = z
      .object({ text: z.string().max(2000), by: By })
      .strict()
      .parse(request.body)
    return act(() => writeReply(db, clock, key, body.text, body.by, replySettings()))
  })

  app.post("/api/drafts/:id/approve", (request) => {
    const { id } = DraftParams.parse(request.params)
    const { by } = z.object({ by: By }).strict().parse(request.body)
    return act(() => approveReply(db, clock, id, by, replySettings()))
  })

  app.post("/api/drafts/:id/refuse", (request) => {
    const { id } = DraftParams.parse(request.params)
    const body = z
      .object({ by: By, reason: z.string().max(500) })
      .strict()
      .parse(request.body)
    return act(() => refuseReply(db, clock, id, body.by, body.reason))
  })

  app.post("/api/drafts/:id/post", (request) => {
    const { id } = DraftParams.parse(request.params)
    const { by } = z.object({ by: By }).strict().parse(request.body)
    return act(() => postReply(db, clock, deps.poster, id, by))
  })

  app.get("/api/settings", (): SettingsAnswer => ({
    ...loadSettings(db),
    apiKeySet: deps.sorter !== undefined,
    poster: deps.poster.name,
  }))

  app.put("/api/settings", (request) => {
    const { by, ...change } = Settings.partial().extend({ by: By }).strict().parse(request.body)
    return act(() => saveSettings(db, clock, change, by))
  })

  app.post("/api/fetch", async () => {
    const settings = loadSettings(db)
    const fetched = await fetchNew(
      db,
      clock,
      {
        ...(settings.googlePlayId ? { googlePlay: settings.googlePlayId } : {}),
        ...(settings.appStoreId ? { appStore: settings.appStoreId } : {}),
      },
      deps.fetchers,
    )
    const sorter = deps.sorter
    const sorted = sorter
      ? await Promise.all(
          appIds(settings).map((appId) =>
            sortPending(db, clock, sorter, { appId, causes, threshold: settings.threshold }),
          ),
        )
      : []
    return {
      fetched,
      sorted: sorted.reduce((total, report) => total + report.sorted, 0),
      needsPerson: sorted.reduce((total, report) => total + report.needsPerson, 0),
      sortingSkipped: !sorter,
    }
  })

  const replySettings = () => {
    const { supportChannel } = loadSettings(db)
    if (supportChannel === "") throw new Refused("set the support channel on the settings page first")
    return { causes, supportChannel }
  }

  if (deps.webDir && existsSync(resolve(deps.webDir, "index.html"))) {
    await app.register(fastifyStatic, { root: resolve(deps.webDir), wildcard: false })
    // The dashboard's own addresses (/queue, /reviews/…) all load its page.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "no such address" })
      return reply.sendFile("index.html")
    })
  }
  return app
}

function reviewKey(params: unknown): ReviewKey {
  const { store, id } = ReviewParams.parse(params)
  return { store, storeReviewId: id }
}

function findOne(db: Db, key: ReviewKey) {
  return findReviews(db, null, { key, limit: 1 })[0]
}
