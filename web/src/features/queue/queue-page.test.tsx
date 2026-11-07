import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { QueuePage } from "@/features/queue/queue-page"
import { reviewAnswer } from "@/test/data"
import { fakeApi, renderPage } from "@/test/render"

describe("the queue", () => {
  it("shows each review's cause, language, money flag and confidence", async () => {
    const { review, label, draftStatus } = reviewAnswer({
      label: { ...reviewAnswer().label!, moneyInvolved: true, language: "taglish" },
    })
    fakeApi({ "GET /api/queue": [{ review, label, draftStatus }] })
    renderPage(<QueuePage />, "/queue")

    expect(await screen.findByText("crash")).toBeInTheDocument()
    expect(screen.getByText("Taglish")).toBeInTheDocument()
    expect(screen.getByText("Money")).toBeInTheDocument()
    expect(screen.getByText("92%")).toBeInTheDocument()
  })
})
