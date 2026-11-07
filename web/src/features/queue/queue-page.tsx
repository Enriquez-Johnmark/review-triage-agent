import { useOverview, useQueue } from "@/app/queries"
import { LoadError } from "@/components/load-error"
import { ReviewTable } from "@/components/review-table"

/** The reviews waiting for a reply: money first, then the newest low ratings (B3). */
export function QueuePage() {
  const queue = useQueue()
  const overview = useOverview()
  if (queue.error) return <LoadError error={queue.error} />
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Queue</h1>
        <p className="text-sm text-muted-foreground">
          Reviews waiting for a reply: money issues first, then the newest one- and two-star
          reviews, and any the model left for a person.
        </p>
      </div>
      {queue.data && <ReviewTable entries={queue.data} causes={overview.data?.causes ?? []} />}
    </section>
  )
}
