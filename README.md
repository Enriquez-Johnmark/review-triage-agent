# Review Triage Agent

**An AI agent that turns an app's public reviews into sorted issues, spikes and replies a person approves.**

It works for any app on Google Play or the App Store. It uses public reviews only and is **not affiliated with any app's maker**.

Status: building. The [brief](docs/product/brief.md), [spec](docs/product/spec.md) (25 acceptance criteria) and [architecture](docs/architecture.md) are approved. M1 is done: reviews are fetched from Google Play and the App Store without reviewer names, stored once each, and CI fails if real review data is ever committed. M2 is done: Claude Haiku sorts each review by cause, language and money involved; unsure or unreadable answers go to a person, causes set by hand are kept, and `eval` measures accuracy on 120 made-up reviews.

```sh
pnpm install
pnpm cli load-sample                                  # 24 made-up reviews into data/reviews.db
pnpm cli fetch --play com.example.app --apple 123456789   # real reviews of an app
pnpm cli sort                                         # sort new reviews (needs ANTHROPIC_API_KEY in .env)
pnpm cli eval                                         # accuracy on the made-up test set
pnpm test
```

MIT ([LICENSE](LICENSE)).
