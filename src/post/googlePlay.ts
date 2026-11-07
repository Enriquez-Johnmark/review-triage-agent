import { GoogleAuth } from "google-auth-library"

import type { Clock } from "../clock.ts"
import type { Db } from "../store/db.ts"
import type { PostRequest, Poster } from "./poster.ts"
import { StubPoster } from "./stub.ts"

/** Sends one request to Google's API with the app owner's credentials. */
export type GoogleRequest = (url: string, body: { replyText: string }) => Promise<void>

/** Posts through Google's Reply to Reviews API. Replying again to the same
 *  review replaces the reply rather than adding one, so finishing a post cut
 *  off by a crash can't post twice (E3). Apple has no such public API: App
 *  Store replies are refused here, to be posted by hand. */
export class GooglePlayPoster implements Poster {
  readonly name = "google_play"
  constructor(private readonly request: GoogleRequest) {}

  async post(request: PostRequest): Promise<void> {
    if (request.store !== "google_play")
      throw new Error("App Store replies need App Store Connect access: post this one by hand")
    const app = encodeURIComponent(request.appId)
    const review = encodeURIComponent(request.storeReviewId)
    await this.request(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${app}/reviews/${review}:reply`,
      { replyText: request.text },
    )
  }
}

/** Requests signed with a service account's key file, which the app owner
 *  creates in their Play Console. */
export function googleRequest(keyFile: string): GoogleRequest {
  const auth = new GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/androidpublisher"] })
  return async (url, data) => {
    const client = await auth.getClient()
    await client.request({ url, method: "POST", data })
  }
}

/** The stand-in, unless the app owner's Google credentials are set
 *  (`GOOGLE_PLAY_CREDENTIALS`, the path of their service account key) (E5). */
export function choosePoster(
  env: { GOOGLE_PLAY_CREDENTIALS?: string | undefined },
  db: Db,
  clock: Clock,
  request: (keyFile: string) => GoogleRequest = googleRequest,
): Poster {
  const keyFile = env.GOOGLE_PLAY_CREDENTIALS?.trim()
  return keyFile ? new GooglePlayPoster(request(keyFile)) : new StubPoster(db, clock)
}
