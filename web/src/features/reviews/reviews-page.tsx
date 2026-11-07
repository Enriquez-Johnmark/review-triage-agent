import { Link, useSearchParams } from "react-router"

import { useOverview, useReviews } from "@/app/queries"
import { LoadError } from "@/components/load-error"
import { ReviewTable } from "@/components/review-table"
import { causeName, weekLabel } from "@/lib/format"

/** The reviews behind a number on the overview: by cause, week or version. */
export function ReviewsPage() {
  const [params] = useSearchParams()
  const reviews = useReviews(params.toString())
  const causes = useOverview().data?.causes ?? []
  const cause = params.get("cause")
  const week = params.get("week")
  const version = params.get("version")
  const title = [
    cause && causeName(causes, cause),
    week && `week of ${weekLabel(week)}`,
    version && `version ${version}`,
  ]
    .filter(Boolean)
    .join(", ")
  if (reviews.error) return <LoadError error={reviews.error} />
  return (
    <section className="space-y-4">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Overview
        </Link>
        <h1 className="text-xl font-semibold">Reviews{title && `: ${title}`}</h1>
      </div>
      {reviews.data && <ReviewTable entries={reviews.data} causes={causes} />}
    </section>
  )
}
