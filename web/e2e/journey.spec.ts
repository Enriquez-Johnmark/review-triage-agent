import { expect, test } from "@playwright/test"

test("a person answers a money complaint: writes, approves and posts the reply once", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByText("Uses public app-store reviews. Not affiliated with any app's maker.")
  ).toBeVisible()
  await expect(page.getByText("Crashes in version 4.2.0")).toBeVisible()

  await page.getByPlaceholder("your name").fill("Ana")
  await page.getByRole("link", { name: "Queue" }).click()
  // Money complaints come first (B3).
  await page.locator("tbody a").first().click()
  await expect(page.getByText("Money involved")).toBeVisible()

  const support = "Message us in the app: Help > Chat."
  await page.getByLabel("Reply text").fill(`Sorry po, we will refund you tomorrow.\n${support}`)
  await page.getByRole("button", { name: /^Save/ }).click()
  await expect(page.getByText("promises a refund, an outcome or a date")).toBeVisible()
  await expect(page.getByRole("button", { name: "Approve this text" })).toHaveCount(0)

  await page
    .getByLabel("Reply text")
    .fill(
      `Pasensya na po sa abala. Tinitingnan na po ng aming team ang inyong transaksyon.\n${support}`
    )
  await page.getByRole("button", { name: /^Save/ }).click()
  await page.getByRole("button", { name: "Approve this text" }).click()
  await page.getByRole("button", { name: "Post" }).click()
  await expect(page.getByText("Posted", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Post" })).toHaveCount(0)
})

test("the settings page says whether the API key is set, never the key", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByText("Not set")).toBeVisible()
  await expect(
    page.getByText("a stand-in that records them: nothing is posted to a real app.")
  ).toBeVisible()
})
