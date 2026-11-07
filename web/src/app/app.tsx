import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"

import { ApiError } from "@/api/client"
import { router } from "@/app/router"

const queryClient = new QueryClient({
  defaultOptions: {
    // A refusal won't change by asking again; a dropped connection might.
    queries: { retry: (count, error) => !(error instanceof ApiError) && count < 2 },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
