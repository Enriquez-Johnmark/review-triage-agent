---
name: milestone
description: How to build one milestone of the Review Triage Agent from docs/architecture.md, from the first test to the code review. Use when the owner says to start or continue a milestone (M1–M7), or before any change to src/ or web/.
---

# Building a milestone

The owner approves each milestone before it starts ("yes, go ahead with M4"). An approval covers that milestone only.

## Before writing code

1. Read the milestone's row in the build order (`docs/architecture.md`) and each criterion it lists in `docs/product/spec.md`.
2. Read the rules in `AGENTS.md` and the words in `GLOSSARY.md`; use those words in code, tests and messages.
3. If a criterion is unclear, or the work needs a choice the spec doesn't make, stop and put it to the owner as a numbered question with a recommended answer. Don't guess.
4. Never commit review data: tests use the made-up reviews in `samples/`; real reviews stay in `data/`, which git ignores.

## For each behaviour

1. **Test first.** Write one test, named after its criterion (`e3_posting_the_same_approved_reply_twice_posts_it_once`), and run it: it must fail for the right reason.
2. **Make it pass** with the smallest change. Safety rules go in `src/core/` or in types (zod schemas, the request type), never only in a prompt.
3. **Run every check** before the commit:
   ```sh
   pnpm lint && pnpm typecheck && pnpm test && pnpm check:data
   ```
   For changes under `web/`, run its own lint, typecheck, test and build too. Report only results you saw.
4. **Commit** one behaviour, under about 150 changed lines, with an imperative message saying what it does ("Refuse a reply that promises a date"). No AI attribution trailers. Commits are signed.
5. **Push** to `main` and check CI. A red CI is the next commit.

## Ending the milestone

1. Check the dashboard in a browser (Playwright, the demo data, no key needed), and look at the screenshots.
2. Run the code review on the milestone's commits. Fix each real finding in its own commit, test first; say plainly which findings are left and why.
3. Update `ROADMAP.md`, the phase table in `AGENTS.md`, `docs/architecture.md` and the README.
4. Record any new decision, dated, in `docs/decisions.md`; a hard-to-reverse trade-off also gets an ADR in `docs/adr/`.
5. Confirm every commit shows as verified on GitHub, then tell the owner what was built, how to try it, and what comes next.
