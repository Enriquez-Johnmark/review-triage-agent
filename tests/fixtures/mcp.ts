// An MCP client connected to the agent's MCP server over made-up reviews.

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

import { loadDemo } from "../../src/demo.ts"
import { buildMcpServer } from "../../src/mcp/server.ts"
import type { Drafter } from "../../src/model/drafter.ts"
import { world } from "./replies.ts"

export async function mcp(drafter?: Drafter) {
  const w = world()
  loadDemo(w.db, w.clock)
  const server = buildMcpServer({ db: w.db, clock: w.clock, drafter })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await server.connect(serverSide)
  const client = new Client({ name: "test", version: "0" })
  await client.connect(clientSide)
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as CallToolResult
    const text = result.content.map((part) => (part.type === "text" ? part.text : "")).join("")
    return { isError: result.isError === true, text, json: () => JSON.parse(text) as unknown }
  }
  return { ...w, client, call }
}
