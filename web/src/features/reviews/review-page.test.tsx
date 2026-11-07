import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ReviewPage } from "@/features/reviews/review-page"
import { setYourName } from "@/lib/your-name"
import { draft, reviewAnswer } from "@/test/data"
import { fakeApi, renderPage } from "@/test/render"

const PATH = "/reviews/google_play/gp-1"
const ROUTE = "/reviews/:store/:id"

describe("the review page", () => {
  beforeEach(() => setYourName("ana"))

  it("approves the draft in the name typed at the top", async () => {
    const calls = fakeApi({
      "GET /api/reviews/google_play/gp-1": reviewAnswer(),
      "POST /api/drafts/7/approve": draft({ status: "approved" }),
    })
    renderPage(<ReviewPage />, PATH, ROUTE)

    await userEvent.click(await screen.findByRole("button", { name: "Approve this text" }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/drafts/7/approve",
        body: { by: "ana" },
      })
    )
  })

  it("offers only real causes for a review left for a person", async () => {
    fakeApi({
      "GET /api/reviews/google_play/gp-1": reviewAnswer({
        label: { cause: null, needsPersonReason: "the model wasn't sure", setBy: "model" },
        draft: null,
      }),
    })
    renderPage(<ReviewPage />, PATH, ROUTE)

    expect(await screen.findByRole("option", { name: "Needs a person" })).toBeDisabled()
  })

  it("shows the rules a draft broke and offers no approval", async () => {
    fakeApi({
      "GET /api/reviews/google_play/gp-1": reviewAnswer({
        draft: draft({
          status: "flagged",
          broken: [{ rule: "promise", detail: "promises a refund, an outcome or a date" }],
        }),
      }),
    })
    renderPage(<ReviewPage />, PATH, ROUTE)

    expect(await screen.findByText(/promises a refund/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Approve this text" })).toBeNull()
  })

  it("an approved reply can be posted, and editing it says the approval goes", async () => {
    fakeApi({
      "GET /api/reviews/google_play/gp-1": reviewAnswer({ draft: draft({ status: "approved" }) }),
    })
    renderPage(<ReviewPage />, PATH, ROUTE)

    expect(await screen.findByRole("button", { name: "Post" })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Reply text"), " Thanks!")
    expect(screen.getByRole("button", { name: /cancels the approval/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Post" })).toBeNull()
  })
})
