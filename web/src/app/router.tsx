import { createBrowserRouter } from "react-router"

import { Shell } from "@/app/shell"

const Loading = () => <p className="p-6 text-sm text-muted-foreground">Loading…</p>

/** Each page is loaded when first visited. */
export const router = createBrowserRouter([
  {
    Component: Shell,
    HydrateFallback: Loading,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/features/overview/overview-page")).OverviewPage,
        }),
      },
      {
        path: "queue",
        lazy: async () => ({ Component: (await import("@/features/queue/queue-page")).QueuePage }),
      },
      {
        path: "reviews",
        lazy: async () => ({
          Component: (await import("@/features/reviews/reviews-page")).ReviewsPage,
        }),
      },
      {
        path: "reviews/:store/:id",
        lazy: async () => ({
          Component: (await import("@/features/reviews/review-page")).ReviewPage,
        }),
      },
      {
        path: "settings",
        lazy: async () => ({
          Component: (await import("@/features/settings/settings-page")).SettingsPage,
        }),
      },
      { path: "*", Component: () => <p>No such page.</p> },
    ],
  },
])
