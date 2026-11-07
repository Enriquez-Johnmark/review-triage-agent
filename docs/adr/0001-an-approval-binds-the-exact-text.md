# An approval binds the exact text approved

A reply goes public on a store page under the company's name, so a person approves every one. The approval records the SHA-256 fingerprint of the exact text the person saw. Editing the reply cancels its approval; posting checks the fingerprint again just before the poster is called, and a mismatch is refused (E2). The post itself records a unique key before calling the store, so a retry or a crash can't post twice (E3).

The deciding reason is that an approval of "a draft" is not an approval of what gets posted. Without the fingerprint, a model redraft, a later edit or a bug between approving and posting could publish words nobody approved.

## Considered options

- **An "approved" flag on the draft.** Simplest, but stays set when the text changes. Rejected.
- **Freeze an approved draft so it can't be edited.** Safe, but a person fixing a typo would have to start over and lose the audit trail of the edit. Rejected in favour of "edit cancels approval".
- **Post straight after approving, in one step.** Leaves no time to catch a mistake, and the store call would sit inside the approval. Rejected.

## Consequences

- A model draft never replaces a reply a person wrote or approved; the MCP server's `draft_reply` follows the same rule.
- Every edit, approval, refusal and post is in the audit log with who and when, so a posted reply can be traced to the person and the text they approved.
- The same idea as the owner's engine, Nudgewright (content hash checked at send time, idempotency key before the provider call), written again in TypeScript here rather than shared.
