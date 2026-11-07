import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/api/client"
import type { Draft, OverviewAnswer, ReviewAnswer, ReviewEntry, SettingsAnswer } from "@/api/types"

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => api<OverviewAnswer>("/api/overview") })

export const useQueue = () =>
  useQuery({ queryKey: ["queue"], queryFn: () => api<ReviewEntry[]>("/api/queue") })

export const useReviews = (search: string) =>
  useQuery({
    queryKey: ["reviews", search],
    queryFn: () => api<ReviewEntry[]>(`/api/reviews?${search}`),
  })

export const reviewPath = (store: string, id: string) =>
  `/api/reviews/${store}/${encodeURIComponent(id)}`

export const useReview = (store: string, id: string) =>
  useQuery({
    queryKey: ["review", store, id],
    queryFn: () => api<ReviewAnswer>(reviewPath(store, id)),
  })

export const useSettings = () =>
  useQuery({ queryKey: ["settings"], queryFn: () => api<SettingsAnswer>("/api/settings") })

/** Any change: afterwards every page shows the stored state again. */
export function useChange<Input, Output = Draft>(send: (input: Input) => Promise<Output>) {
  const client = useQueryClient()
  return useMutation({ mutationFn: send, onSettled: () => client.invalidateQueries() })
}
