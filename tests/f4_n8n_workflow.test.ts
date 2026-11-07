import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"
import { z } from "zod"

import { buildSummaryServer } from "../src/api/summaryServer.ts"
import { world } from "./fixtures/replies.ts"

/** The parts of n8n's workflow format the agent relies on. */
const Workflow = z.object({
  name: z.string(),
  nodes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      typeVersion: z.number(),
      position: z.tuple([z.number(), z.number()]),
      parameters: z.record(z.string(), z.unknown()),
      credentials: z.record(z.string(), z.object({ id: z.string(), name: z.string() })).optional(),
    }),
  ),
  connections: z.record(
    z.string(),
    z.object({
      main: z.array(z.array(z.object({ node: z.string(), type: z.literal("main"), index: z.number() }))),
    }),
  ),
  settings: z.object({ timezone: z.string() }).loose(),
})

const workflow = Workflow.parse(JSON.parse(readFileSync("n8n/daily-summary.json", "utf8")))
const node = (type: string) => {
  const found = workflow.nodes.find((each) => each.type === type && each.name !== "Run it now")
  if (!found) throw new Error(`no ${type} node`)
  return found
}
const next = (name: string) => workflow.connections[name]?.main[0]?.map((link) => link.node) ?? []

describe("F4, the n8n workflow", () => {
  it("f4_the_committed_workflow_is_valid_n8n_with_every_link_to_a_real_node", () => {
    const names = workflow.nodes.map((each) => each.name)
    expect(new Set(names).size).toBe(names.length)
    for (const [from, links] of Object.entries(workflow.connections)) {
      expect(names).toContain(from)
      for (const link of links.main.flat()) expect(names).toContain(link.node)
    }
  })

  it("f4_each_morning_it_fetches_then_calls_the_agents_summary_and_emails_it", () => {
    const trigger = node("n8n-nodes-base.scheduleTrigger")
    expect(trigger.parameters).toEqual({ rule: { interval: [{ field: "days", triggerAtHour: 8 }] } })
    expect(workflow.settings.timezone).toBe("Asia/Manila")

    const [fetchName] = next(trigger.name)
    const fetchNode = workflow.nodes.find((each) => each.name === fetchName)
    expect(fetchNode?.parameters).toMatchObject({
      method: "POST",
      url: "http://host.docker.internal:4318/fetch",
    })
    const [summaryName] = next(fetchName ?? "")
    const summary = workflow.nodes.find((each) => each.name === summaryName)
    expect(summary?.parameters).toMatchObject({
      method: "GET",
      url: "http://host.docker.internal:4318/summary",
    })
    for (const call of [fetchNode, summary])
      expect(call?.credentials?.httpHeaderAuth?.name).toBe("Review Triage Agent token")

    const [emailName] = next(summaryName ?? "")
    expect(emailName).toBe(node("n8n-nodes-base.emailSend").name)
    expect(node("n8n-nodes-base.emailSend").parameters).toMatchObject({
      emailFormat: "text",
      text: "={{ $json.text }}",
    })
  })

  it("f4_the_addresses_it_calls_are_the_summary_listeners_own", async () => {
    const { db, clock } = world()
    const none = () => Promise.resolve({ reviews: [], skipped: 0 })
    const app = buildSummaryServer({
      db,
      clock,
      sorter: undefined,
      fetchers: { googlePlay: none, appStore: none },
      token: "made-up-token-for-tests-0123456789",
    })
    await app.ready()
    expect(app.hasRoute({ method: "GET", url: "/summary" })).toBe(true)
    expect(app.hasRoute({ method: "POST", url: "/fetch" })).toBe(true)
  })
})
