# Reviewer names are dropped inside the fetcher, and no review data is committed

The agent works on public reviews, but a public review still has a person behind it. Reviewer names and pictures are dropped inside each fetcher, before a review exists in the program: the stored `Review` type has no name field, and a review with one is refused by its type (A1). Real reviews and the database live in `data/`, which git ignores; tests and the demo use made-up reviews; and a check in CI (`pnpm check:data`) fails if review data is committed (A3).

The deciding reason is that the agent never needs to know who wrote a review to sort it or reply, and data it never keeps can't leak, be committed by mistake or end up in a screenshot.

## Considered options

- **Keep names and hide them in the dashboard.** Names would still be in the database, the model requests and any backup. Rejected.
- **Hash names to count repeat reviewers.** Not needed by any criterion, and a hash of a public name can be reversed by trying names. Rejected.
- **Commit a small set of real reviews for tests.** Realistic, but it would publish other people's words in this repository. Rejected: tests use made-up reviews.

## Consequences

- The real test set (about 150 reviews) is kept on the owner's machine; only its scores are published, without naming the apps.
- Review text can still name a person; such a review was left out of the real test set, and the model request carries only the text, stars, app version and cause (D4).
