# UI audit and polish, 2026-11-10

An audit of the dashboard with the `ui-taste` skill (`reference/audit.md`), then a polish pass (`reference/polish.md`) that kept the existing look. Owner's decision: `docs/decisions.md`, 2026-11-10.

## What was inspected

- **Build:** `main` at `5f8c3cf`, on the made-up demo (`pnpm cli load-demo`: 120 reviews of `com.example.wallet`).
- **Browser:** Chromium (Playwright) at 1280×860 and 390×844 (phone, touch emulated).
- **Pages:** the overview with its charts, the queue, the reviews behind a spike, a review with its reply box, and settings.
- **Checks:** a script measured horizontal overflow on every page at both sizes; keyboard Tab order through the navigation.
- **Not checked:** a screen reader, zoom above 100% and real phones.

## Findings and what was done

| #   | Priority | Finding                                                                                                                                                                  | Done                                                                                                        |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | P2       | In the queue's Cause column the cause, language, money flag and confidence wrapped together, so a row's cause didn't read first, and the confidence ("93%") had no label | The cause has its own line; below it, quieter, the money flag, the language and "93% confident" (`f769fd2`) |
| 2   | P3       | Two of the eight cause colours in "Causes by week" (cash-out and login) are both greens                                                                                  | Left as is: each bar also has a table view ("Show as a table"), so colour is never the only way to read it  |

**Checked and fine:**

- Every page fits a phone with no horizontal overflow. On a phone the queue becomes one card per review.
- Star ratings carry an accessible label ("2 stars").
- The reply box says what's needed before acting ("Type your name at the top").
- The footer's "not affiliated" line is on every page.

## Checks after the fixes

- `pnpm lint`, `typecheck` and `test` (172 tests) passed before the commit.
- The dashboard's own checks (`web/`: lint, typecheck, 11 tests, build) passed too.
- The queue was captured again at both sizes and inspected.
- The showcase was remade on a fresh demo.
