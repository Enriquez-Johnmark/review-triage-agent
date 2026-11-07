# Showcase

Screenshots and a captioned walkthrough of the dashboard on the made-up demo (`pnpm cli load-demo`): 120 invented reviews of a fictional finance app, `com.example.wallet`, sorted, with a crash spike in version 4.2.0 this week. No API key was used, so in the video a person writes the reply; with a key, Claude drafts it and the same rules check it.

| File                                        | Shows                                                                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `walkthrough.mp4`                           | About a minute and a half: the overview and its spikes, the reviews behind a spike, the queue, a reply caught promising a refund, a reply that keeps every rule, approving and posting it once, and the settings |
| `desktop-1-overview.png`                    | This week's numbers, top causes, spikes, causes by week and crash share by version                                                                                                                               |
| `desktop-2-spike-reviews.png`               | The reviews behind a version's crash spike                                                                                                                                                                       |
| `desktop-3-queue.png`                       | The queue: money complaints first, with cause, language and confidence                                                                                                                                           |
| `desktop-4-rule-caught.png`                 | A reply that promises a refund, refused by the rules                                                                                                                                                             |
| `desktop-5-approved.png`                    | A reply approved exactly as written, ready to post                                                                                                                                                               |
| `desktop-6-settings.png`                    | The app to watch, the support channel, the threshold; whether the API key is set, never the key                                                                                                                  |
| `phone-1-overview.png`, `phone-2-queue.png` | The overview and the queue on a phone                                                                                                                                                                            |

## Making them again

Playwright scripts in `web/showcase/` make them against the real server, which starts on a fresh demo database. Making the video needs `ffmpeg`.

```sh
pnpm --dir web build
pnpm --dir web showcase
```
