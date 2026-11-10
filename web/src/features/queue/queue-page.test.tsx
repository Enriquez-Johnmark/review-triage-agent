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

    // Each shows twice: as a card for phones and a table row for wider screens.
    expect(await screen.findAllByText("crash")).toHaveLength(2)
    for (const text of ["Taglish · 92% confident", "Money"])
      expect(screen.getAllByText(text)).toHaveLength(2)
  })
})
