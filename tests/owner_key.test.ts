import { describe, expect, it } from "vitest"

import { useOwnerKey } from "../src/env.ts"

describe("the owner's key", () => {
  it("is taken from OWNER_ANTHROPIC_API_KEY when ANTHROPIC_API_KEY isn't set", () => {
    const env: NodeJS.ProcessEnv = { OWNER_ANTHROPIC_API_KEY: "sk-ant-made-up" }
    useOwnerKey(env)
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-made-up")
  })

  it("leaves a key from .env as it is", () => {
    const env: NodeJS.ProcessEnv = {
      ANTHROPIC_API_KEY: "sk-ant-local",
      OWNER_ANTHROPIC_API_KEY: "sk-ant-cloud",
    }
    useOwnerKey(env)
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-local")
  })

  it("sets nothing when neither is there", () => {
    const env: NodeJS.ProcessEnv = {}
    useOwnerKey(env)
    expect(env.ANTHROPIC_API_KEY).toBeUndefined()
  })
})
