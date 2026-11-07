import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { vi } from "vitest"

import { Shell } from "@/app/shell"

/** Answers the dashboard's API calls with made-up data: `answers` maps a
 *  method and path ("GET /api/settings") to its JSON. Returns the calls made. */
export function fakeApi(answers: Record<string, unknown>) {
  const calls: { method: string; path: string; body: unknown }[] = []
  vi.stubGlobal("fetch", (path: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET"
    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const answer = answers[`${method} ${path}`]
    return Promise.resolve(
      answer === undefined
        ? new Response(JSON.stringify({ error: "no such address" }), { status: 404 })
        : new Response(JSON.stringify(answer), { status: 200 })
    )
  })
  return calls
}

/** Renders `page` at `path` inside the dashboard's layout. */
export function renderPage(page: ReactNode, path: string, route = path) {
  const router = createMemoryRouter(
    [{ Component: Shell, children: [{ path: route, element: page }] }],
    {
      initialEntries: [path],
    }
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
