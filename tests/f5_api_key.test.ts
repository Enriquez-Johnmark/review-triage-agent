import { AuthenticationError } from "@anthropic-ai/sdk"
import { describe, expect, it, vi } from "vitest"

import type { Drafter } from "../src/model/drafter.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"
import { server } from "./fixtures/server.ts"

const KEY = "sk-ant-api03-MADE-UP-TEST-KEY-0000"

/** Fails the way the SDK can: with an error whose message quotes the request. */
const leaky: Drafter = {
  model: "leaky",
  draft: () =>
    Promise.reject(
      new AuthenticationError(401, { message: `invalid x-api-key: ${KEY}` }, undefined, new Headers()),
    ),
}

describe("F5", () => {
  it("f5_the_api_key_never_appears_in_an_api_answer_or_a_log_even_when_the_model_fails", async () => {
    const { app } = await server({ sorter: new FakeSorter(() => confident("crash")), drafter: leaky })
    const previous = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = KEY
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined)
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
      expect(answers[6].statusCode).toBe(502)
      expect(answers[6].json()).toEqual({ error: "Claude couldn't answer (401); see the command line" })
      expect(logged).toHaveBeenCalled()
      for (const call of logged.mock.calls) expect(call.join(" ")).not.toContain(KEY)
    } finally {
      logged.mockRestore()
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = previous
    }
  })

  it("f5_the_settings_say_only_whether_the_key_is_set", async () => {
    const { app } = await server()
    expect((await app.inject("/api/settings")).json()).toMatchObject({ apiKeySet: false, poster: "stub" })
  })
})
