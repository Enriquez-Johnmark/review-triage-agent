import { createHash } from "node:crypto"

/** The SHA-256 of a reply's exact text: an approval binds it (E2). */
export function fingerprint(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}
