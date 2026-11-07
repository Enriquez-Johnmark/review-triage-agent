import { describe, expect, it } from "vitest"

import type { Drafter } from "../src/model/drafter.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"
import { server } from "./fixtures/server.ts"

const KEY = "sk-ant-api03-MADE-UP-TEST-KEY-0000"

/** Fails the way an SDK can: with an error that quotes the request. */
class LeakyError extends Error {
  status = 401
}
const leaky: Drafter = {
  model: "leaky",
  draft: () => Promise.reject(new LeakyError(`invalid x-api-key: ${KEY}`)),
}

describe("F5", () => {
  it("f5_the_api_key_never_appears_in_an_api_answer_even_when_the_model_fails", async () => {
    const { app } = await server({ sorter: new FakeSorter(() => confident("crash")), drafter: leaky })
    const previous = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = KEY
    try {
      const answers = await Promise.all([
        app.inject("/api/overview"),
        app.inject("/api/summary"),
        app.inject("/api/queue"),
        app.inject("/api/reviews"),
        app.inject("/api/reviews/google_play/gp-crash"),
        app.inject("/api/settings"),
        app.inject({ method: "POST", url: "/api/reviews/google_play/gp-crash/draft" }),
        app.inject({ method: "POST", url: "/api/fetch" }),
      ])
      for (const answer of answers) expect(answer.body).not.toContain(KEY)
      expect(answers[5].json()).toMatchObject({ apiKeySet: true })
      expect(answers[6].statusCode).toBe(500)
    } finally {
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = previous
    }
  })

  it("f5_the_settings_say_only_whether_the_key_is_set", async () => {
    const { app } = await server()
    expect((await app.inject("/api/settings")).json()).toMatchObject({ apiKeySet: false, poster: "stub" })
  })
})
