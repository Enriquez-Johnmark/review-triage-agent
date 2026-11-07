# The daily summary in n8n

`daily-summary.json` is an n8n workflow: each morning at 8 (Manila time) it
asks the agent to fetch and sort new reviews, gets the daily summary and emails
it. In the demo the email goes to Mailpit; nothing leaves your computer.

The summary has five parts: new reviews since yesterday, the share answered
this week, the top three causes, spikes, and the money complaints still
waiting for a reply.

## Run it

1. Put a long random token in `.env`, e.g. `SUMMARY_TOKEN=` followed by the
   output of `openssl rand -hex 24`, and start the agent: `pnpm cli serve`.
   With the token set, it also opens the summary on port 4318 for n8n: only
   the summary and a fetch, and only with the token. The dashboard stays on
   127.0.0.1.
2. Start n8n and Mailpit: `docker compose up -d`. Open n8n at
   http://localhost:5678 and create its local owner account.
3. Import the workflow:
   `docker compose exec n8n n8n import:workflow --input=/workflows/daily-summary.json`
4. In n8n, under Credentials, add two:
   - **Header Auth**, named `Review Triage Agent token`: name `Authorization`,
     value `Bearer ` followed by your token.
   - **SMTP**, named `Mailpit`: host `mailpit`, port `1025`, SSL off, no user
     or password.
5. Open the workflow and click "Run it now" to try it: the email appears in
   Mailpit at http://localhost:8025. Turn the workflow on to have it run each
   morning.

To send to a real inbox instead, change the SMTP credential and the
"Email the summary" node's address.
