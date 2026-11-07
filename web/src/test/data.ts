// Made-up answers for the dashboard's tests. Every review here is invented.

import type { Draft, ReviewAnswer, SettingsAnswer } from "@/api/types"

export const causes = [
  { id: "crash", label: "Crash or won't open" },
  { id: "login", label: "Login, PIN or OTP" },
]

export const settings: SettingsAnswer = {
  googlePlayId: "com.example.wallet",
  appStoreId: null,
  supportChannel: "Message us in the app: Help > Chat.",
  threshold: 0.6,
  apiKeySet: true,
  poster: "stub",
}

export const draft = (change: Partial<Draft> = {}): Draft => ({
  id: 7,
  review: { store: "google_play", storeReviewId: "gp-1" },
  text: "Sorry the app closes after the update.\nMessage us in the app: Help > Chat.",
  writtenBy: "model",
  status: "ready",
  broken: [],
  approvedFingerprint: null,
  approvedBy: null,
  ...change,
})

export const reviewAnswer = (change: Partial<ReviewAnswer> = {}): ReviewAnswer => ({
  review: {
    store: "google_play",
    storeReviewId: "gp-1",
    appId: "com.example.wallet",
    at: "2026-11-03T00:00:00.000Z",
    stars: 1,
    text: "The app closes right after the update.",
    appVersion: "4.2.0",
    companyReplied: false,
  },
  label: {
    cause: "crash",
    needsPersonReason: null,
    setBy: "model",
    language: "english",
    moneyInvolved: false,
    confidence: 0.92,
  },
  draftStatus: "ready",
  draft: draft(),
  causes,
  ...change,
})
