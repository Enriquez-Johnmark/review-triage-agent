import { Link } from "react-router"

import type { CauseName, ReviewEntry } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { causeName, percent, shortDate, stars } from "@/lib/format"

export const DRAFT_STATUS: Record<string, string> = {
  ready: "Draft ready",
  flagged: "For a person to write",
  approved: "Approved",
  refused: "Refused",
  posted: "Posted",
}

/** Reviews in a table, each linking to its own page. */
export function ReviewTable({
  entries,
  causes,
}: {
  entries: readonly ReviewEntry[]
  causes: readonly CauseName[]
}) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No reviews here.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Stars</TableHead>
          <TableHead className="w-1/2">Review</TableHead>
          <TableHead>Cause</TableHead>
          <TableHead>Reply</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(({ review, label, draftStatus }) => (
          <TableRow key={`${review.store}:${review.storeReviewId}`}>
            <TableCell className="whitespace-nowrap">{shortDate(review.at)}</TableCell>
            <TableCell className="whitespace-nowrap" aria-label={`${review.stars} stars`}>
              {stars(review.stars)}
            </TableCell>
            <TableCell className="max-w-0 whitespace-normal">
              <Link
                className="line-clamp-2 hover:underline"
                to={`/reviews/${review.store}/${encodeURIComponent(review.storeReviewId)}`}
              >
                {review.text || "(no text)"}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Badge variant={label?.cause ? "secondary" : "warning"}>
                  {label ? causeName(causes, label.cause) : "Not sorted yet"}
                </Badge>
                {label?.moneyInvolved && <Badge variant="destructive">Money</Badge>}
                {label?.confidence !== undefined && label.setBy === "model" && (
                  <span className="text-xs text-muted-foreground">{percent(label.confidence)}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {draftStatus ? DRAFT_STATUS[draftStatus] : review.companyReplied ? "Answered" : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
