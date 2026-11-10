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
- **Spec Round 1** (`docs/product/spec.md`): the fixed list of causes with language and a money flag; low confidence goes to a person; accuracy measured on ~120 made-up and ~150 real reviews (the owner spot-checks 20); spikes at double the four-week average and at least 5 reviews, and by app version; replies by Claude Sonnet, 350 characters at most, checked by code, redrafted once; approval binds the exact text; an audit log; posting through a stand-in until the owner's credentials are set; one local user.
- **Spec Round 2:** a four-page dashboard (overview, queue, review, settings) with two charts; an MCP server with five tools, none of which can approve or post; a `fetch` command that skips reviews already fetched; an n8n workflow emailing a daily summary; the demo uses real reviews without names, never posting to the real app.
- **Any app:** the agent works for any app on Google Play or the App Store; causes are a setting with a finance-app default; the public demo uses two or three popular Philippine finance apps so no single company stands out, and the repository names no app maker.
- **Spec Round 3:** 25 acceptance criteria (A1–G1); the spec is complete.
- **Architecture** (`docs/architecture.md`): one TypeScript package with the dashboard in `web/`; SQLite; the model behind an interface with live and recorded versions; posting once with a key recorded first; an injected clock; the official MCP SDK; n8n calling `/api/summary`; build order M1–M7.

## 2026-11-07

- **Real test set:** the agent's author prepares the labels in the cloud session: 149 recent public Google Play reviews of three popular Philippine finance apps (50 each, one dropped for naming a person), mixed by stars, without reviewer names, phone numbers, emails or long numbers. The file goes to the owner's `data/` folder and is never committed; the owner spot-checks 20 chosen by a fixed hash. Only the scores are published, without naming the apps.

## 2026-11-10

- **UI polish with `ui-taste`:** Uizze's `ui-taste` skill (v0.3.0, Apache-2.0) is added, pinned and recorded, without the paid Uizze MCP. Every product gets an audit (look only, with real desktop and phone screenshots), then a polish pass that keeps its current look, one product at a time: Lab Report Assistant, Kompleto, Balanse, Review Triage Agent, Help Assistant, then the portfolio; each product's screenshots, video and portfolio page are remade before the next starts. Every rule that protects an acceptance criterion stays in code, and every test must still pass (owner: "yes to all").
