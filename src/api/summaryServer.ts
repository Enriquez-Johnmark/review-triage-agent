import { timingSafeEqual } from "node:crypto"

import Fastify, { type FastifyInstance } from "fastify"

import type { Clock } from "../clock.ts"
import { dailyAnswer } from "../commands/daily.ts"
import { type Fetchers, fetchAndSort } from "../commands/fetch.ts"
import { FINANCE_CAUSES } from "../core/causes.ts"
import type { Sorter } from "../model/sorter.ts"
import type { Db } from "../store/db.ts"
import { appIds, loadSettings } from "../store/settings.ts"

/** The shortest token accepted: long enough that guessing it is hopeless. */
export const MIN_TOKEN = 24

export interface SummaryDeps {
  db: Db
  clock: Clock
  sorter: Sorter | undefined
  fetchers: Fetchers
  /** Sent by n8n as `Authorization: Bearer <token>`. */
  token: string
}

/** What n8n, in Docker, may reach (F4): the daily summary and a fetch, behind
 *  a token, and nothing else. The dashboard stays on 127.0.0.1 only. */
export function buildSummaryServer(deps: SummaryDeps): FastifyInstance {
  if (deps.token.length < MIN_TOKEN)
    throw new Error(`SUMMARY_TOKEN must be at least ${String(MIN_TOKEN)} characters`)
  const expected = Buffer.from(`Bearer ${deps.token}`)
  const app = Fastify({ logger: false })

  app.addHook("onRequest", async (request, reply) => {
    const given = Buffer.from(request.headers.authorization ?? "")
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return reply.code(401).send({ error: "a valid token is needed" })
  })
  app.setErrorHandler((_error, _request, reply) =>
    reply.code(500).send({ error: "something went wrong; see the command line" }),
  )

  app.get("/summary", () => dailyAnswer(deps.db, deps.clock, appIds(loadSettings(deps.db)), FINANCE_CAUSES))
  app.post("/fetch", () => fetchAndSort(deps.db, deps.clock, deps.sorter, deps.fetchers, FINANCE_CAUSES))
  return app
}
