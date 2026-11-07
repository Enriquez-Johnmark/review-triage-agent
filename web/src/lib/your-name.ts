import { useSyncExternalStore } from "react"

// Who is using the dashboard: their name goes with every approval, edit and
// post (E4). It is kept in this browser only; there are no accounts.
const KEY = "review-triage-agent.name"
const listeners = new Set<() => void>()

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}

export function setYourName(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Storage blocked: the name lasts until the page is reloaded.
    fallback = name
  }
  for (const listener of listeners) listener()
}

let fallback = ""

export function useYourName(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => read() || fallback
  )
}
