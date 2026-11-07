import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { NOT_AFFILIATED } from "@/components/footer"
import { SettingsPage } from "@/features/settings/settings-page"
import { setYourName } from "@/lib/your-name"
import { fakeApi, renderPage } from "@/test/render"
import { settings } from "@/test/data"

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]
  )

describe("G1", () => {
  it("g1_every_page_says_it_uses_public_reviews_and_is_not_affiliated", async () => {
    fakeApi({ "GET /api/settings": settings })
    renderPage(<SettingsPage />, "/settings")
    expect(await screen.findByText(NOT_AFFILIATED)).toBeInTheDocument()
    expect(NOT_AFFILIATED).toBe(
      "Uses public app-store reviews. Not affiliated with any app's maker."
    )
  })

  it("g1_the_dashboard_has_no_images_but_its_own_icon", () => {
    expect(readdirSync("public")).toEqual(["favicon.svg"])
    const withImages = files("src")
      .filter((file) => !file.endsWith(".test.tsx"))
      .filter((file) => /<img\b|\.(png|jpe?g|webp|gif)\b/i.test(readFileSync(file, "utf8")))
    expect(withImages).toEqual([])
  })
})

describe("the settings page", () => {
  it("saves the settings in the name typed at the top, and says so", async () => {
    setYourName("ana")
    let stored = settings
    const calls = fakeApi({
      "GET /api/settings": () => stored,
      "PUT /api/settings": (body: unknown) => (stored = { ...stored, ...(body as object) }),
    })
    renderPage(<SettingsPage />, "/settings")

    await userEvent.type(await screen.findByLabelText("Support channel"), " Salamat!")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Saved.")).toBeInTheDocument()
    expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
      by: "ana",
      threshold: 0.6,
    })
  })
})

describe("F5", () => {
  it("f5_the_settings_page_says_only_whether_the_api_key_is_set", async () => {
    fakeApi({ "GET /api/settings": settings })
    renderPage(<SettingsPage />, "/settings")
    expect(await screen.findByText("Set")).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/sk-ant/)).toBeNull()
  })
})
