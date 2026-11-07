# Glossary

The Review Triage Agent reads an app's public reviews, sorts each by cause, spots spikes and drafts replies a person approves. Use these words in code, docs and messages.

## Reviews

**App**:
One app being watched, on Google Play, the App Store or both (one store ID each).
_Avoid_: Product, client

**Store**:
Google Play or the App Store.

**Review**:
One public store review: its store and store review ID, the app, date, stars, text, app version and whether the company replied. **Never the reviewer's name.**
_Avoid_: Comment, feedback, post

**Sample**:
The made-up reviews in `samples/`, used by tests and the demo. Real reviews stay in `data/` and are never committed.
_Avoid_: Fixture data, dataset

## Sorting

**Cause**:
Why a review is unhappy (login and OTP, failed transfer, crash…), from a fixed list that is a setting.
_Avoid_: Category, tag, topic

**Label**:
A review's cause, language, money flag and confidence, set by the model or by a person.
_Avoid_: Classification, annotation

**Money complaint**:
A review about money lost, held or charged wrongly; it is shown first and counted in the daily summary.
_Avoid_: Financial issue, priority

**Needs a person**:
A review the model couldn't sort with enough confidence, or whose answer didn't parse; a person sets its cause.
_Avoid_: Unknown, error, fallback

## Spikes

**Week**:
Monday at midnight to the next, Manila time.

**Spike**:
A week, or an app version, with at least twice the four-week average of a cause and at least 5 reviews of it.
_Avoid_: Anomaly, alert, trend

## Replies

**Draft**:
A reply written by the model or a person, with its rule-check results. Not yet approved.
_Avoid_: Suggestion, response

**Rule check**:
The checks in code a reply must pass: no promised refund or date, no request for an account number, PIN or OTP, the review's language, the length, the support channel at the end.
_Avoid_: Guardrail, filter, moderation

**Approval**:
A person, by name, approving a draft; it records the fingerprint of the exact text approved.
_Avoid_: Sign-off, accept

**Fingerprint**:
The SHA-256 of a reply's exact text. Editing the text after approval cancels the approval.
_Avoid_: Hash (in docs), checksum

**Post**:
Sending an approved reply to the store, once, with a key recorded before the poster is called.
_Avoid_: Publish, send

**Support channel**:
The company's contact text, added by code to the end of every reply; the model never writes one.

**Audit log**:
Every draft, edit, approval, refusal, post and hand-set cause: when, who and what. Append-only.
