# Review Triage Agent

**An AI agent that turns an app's public reviews into sorted issues, spikes and replies a person approves.**

It works for any app on Google Play or the App Store. It uses public reviews only and is **not affiliated with any app's maker**.

Status: building. The [brief](docs/product/brief.md), [spec](docs/product/spec.md) (25 acceptance criteria) and [architecture](docs/architecture.md) are approved. M1 is done: reviews are fetched from Google Play and the App Store without reviewer names, stored once each, and CI fails if real review data is ever committed.

```sh
pnpm install
pnpm cli load-sample                                  # 24 made-up reviews into data/reviews.db
pnpm cli fetch --play com.example.app --apple 123456789   # real reviews of an app
pnpm test
```

MIT ([LICENSE](LICENSE)).
