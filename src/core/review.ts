import { z } from "zod"

/** The stores reviews come from. */
export const Store = z.enum(["google_play", "app_store"])
export type Store = z.infer<typeof Store>

/**
 * One public review, as the agent keeps it: everything needed to
 * sort and answer it, and nothing about who wrote it. There is no field
 * for a name or picture, so none can be stored (A1).
 */
export const Review = z
  .object({
    store: Store,
    storeReviewId: z.string().min(1),
    appId: z.string().min(1),
    at: z.iso.datetime(),
    stars: z.number().int().min(1).max(5),
    text: z.string(),
    appVersion: z.string().min(1).nullable(),
    /** Whether the app's maker replied; `null` when the store doesn't say (Apple's feed). */
    companyReplied: z.boolean().nullable(),
  })
  .strict()
export type Review = z.infer<typeof Review>
