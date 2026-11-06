# Decisions

Every decision the owner made, dated.

## 2026-11-06

- **Build it:** a flagship portfolio project for AI engineering roles: an AI agent that sorts an app's public reviews, spots spikes and drafts replies a person approves.
- **Working name:** Review Triage Agent; may be renamed (Hearback and Tugon were considered).
- **Data:** public Google Play and App Store reviews; reviewer names dropped; no raw data committed.
- **Scope:** sorting by cause, spikes by week and app version, replies approved by a person; a dashboard, an MCP server and one n8n workflow.
- **Technology:** TypeScript, SQLite, Claude via API key, tests.
- **Repository:** public, saying it uses public reviews and is not affiliated with any app's maker.
- **Brief:** approved (`docs/product/brief.md`).
- **Licence:** MIT, so anyone can clone and run it.
