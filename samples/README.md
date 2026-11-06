# Samples

Made-up reviews of a fictional finance app (`com.example.wallet`), for tests and the demo:

- `reviews.json`: 24 reviews for the demo.
- `labelled.json`: 120 reviews, 12 per cause, each with its correct cause, language and money flag, for the accuracy test (B4).
- `recorded-labels.json`: the model's answers to `labelled.json`, recorded by `pnpm cli eval --record` with the owner's API key, so CI checks accuracy without one.

Every review here was written for this project; none is copied from a store, and no person or company is named.

Real reviews are fetched into the ignored `data/` folder and never committed (A3).
