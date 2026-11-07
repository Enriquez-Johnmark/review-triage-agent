# Review Triage Agent

**An AI agent that turns an app's public reviews into sorted issues, spikes and replies a person approves.**

It works for any app on Google Play or the App Store. It uses public reviews only and is **not affiliated with any app's maker**.

Status: building. The [brief](docs/product/brief.md), [spec](docs/product/spec.md) (25 acceptance criteria) and [architecture](docs/architecture.md) are approved. M1 is done: reviews are fetched from Google Play and the App Store without reviewer names, stored once each, and CI fails if real review data is ever committed. M2 is done: Claude Haiku sorts each review by cause, language and money involved; unsure or unreadable answers go to a person, causes set by hand are kept, and `eval` measures accuracy on 120 made-up reviews. M3 is done: spikes by week (double the four-week average, at least 5 reviews) and by app version (double the previous version's crash share), and this week's numbers: reviews, share answered, top causes. M4 is done: Claude Sonnet drafts replies in the reviewer's language; code checks every draft (no promised refunds or dates, no asking for PINs or OTPs, no blame, 350 characters, the support channel at the end) and redrafts once; a person approves the exact text, and it is posted once, to a stand-in unless the app owner's Google credentials are set; every step is in an append-only log. M5 is done: a local dashboard (overview with charts, queue, review page, settings) over the same rules, which never shows the API key.

Try the dashboard with 120 made-up reviews, no API key needed:

```sh
pnpm install && pnpm --dir web install && pnpm --dir web build
pnpm cli load-demo     # made-up reviews, already sorted, with a crash spike this week
pnpm cli serve         # http://127.0.0.1:4317
```

Type your name at the top, open the queue, write or draft a reply, approve it and post it (to the stand-in: nothing reaches a real app). With your Anthropic API key in `.env`, "Draft with Claude" and "Fetch new reviews" sort and draft live; choose the app on the settings page.

The same from the command line:

```sh
pnpm cli fetch          # new reviews of the app chosen in the settings (or --play/--apple)
pnpm cli sort           # sort them (needs ANTHROPIC_API_KEY in .env)
pnpm cli summary        # this week's numbers and the spikes
pnpm cli draft          # draft replies for the queue (needs the API key)
pnpm cli drafts         # the drafts and their rule checks
pnpm cli approve --draft 1 --by ana
pnpm cli post --draft 1 --by ana
pnpm cli eval           # accuracy on the made-up test set
pnpm test && pnpm --dir web test
```

MIT ([LICENSE](LICENSE)).
