# The MCP server can read and draft, but it can't approve or post

The MCP server lets an AI assistant (Claude Desktop, Claude Code) use the agent: list reviews and issues, read spikes and draft a reply. Its five tools are fixed in code, and `src/mcp/` doesn't import the approve, edit or post functions at all; a test fails if it does (F2). Approving and posting stay in the dashboard, done by a person by name.

The deciding reason is that an MCP client is another model. If a tool could approve or post, the person-approves-every-reply rule would depend on that model's instructions, which is exactly what this project says agent safety must not do.

## Considered options

- **Approve and post tools behind a confirmation prompt.** The client decides whether to ask, and the prompt can be skipped. Rejected.
- **The same tools with a permission setting.** One wrong setting would let a model post publicly under the company's name. Rejected.
- **No MCP server.** Safe, but loses a useful way to explore reviews from an assistant. Rejected: reading and drafting are safe because a draft still needs a person.

## Consequences

- A draft made over MCP appears in the dashboard's queue like any other and needs a person's approval.
- `draft_reply` never replaces a reply a person wrote.
- Inputs are strict zod schemas; an unknown field or bad value is refused, saying what is wrong.
