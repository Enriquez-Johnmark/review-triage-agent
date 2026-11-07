import { useState } from "react"
import { Link, useParams } from "react-router"

import { api } from "@/api/client"
import type { Draft, ReviewAnswer } from "@/api/types"
import { reviewPath, useChange, useReview } from "@/app/queries"
import { LoadError } from "@/components/load-error"
import { DRAFT_STATUS, LANGUAGE } from "@/components/review-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { causeName, percent, shortDate, stars } from "@/lib/format"
import { useYourName } from "@/lib/your-name"

/** One review with its reply: draft, edit, approve, refuse or post. The rules
 *  are checked by the agent; this page only shows their results. */
export function ReviewPage() {
  const { store = "", id = "" } = useParams()
  const review = useReview(store, id)
  if (review.error) return <LoadError error={review.error} />
  if (!review.data) return null
  return (
    <section className="space-y-6">
      <Link to="/queue" className="text-sm text-muted-foreground hover:underline">
        ← Queue
      </Link>
      <ReviewCard answer={review.data} path={reviewPath(store, id)} />
      {/* A new stored text starts the editor afresh. */}
      <ReplyCard
        key={`${review.data.draft?.id ?? "none"}:${review.data.draft?.text ?? ""}`}
        answer={review.data}
        path={reviewPath(store, id)}
      />
    </section>
  )
}

function ReviewCard({ answer, path }: { answer: ReviewAnswer; path: string }) {
  const name = useYourName()
  const { review, label, causes } = answer
  const setCause = useChange((cause: string) =>
    api(`${path}/cause`, { method: "POST", body: { cause, by: name } })
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span aria-label={`${review.stars} stars`}>{stars(review.stars)}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {shortDate(review.at)} · {review.store === "google_play" ? "Google Play" : "App Store"}
            {review.appVersion && ` · version ${review.appVersion}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap">{review.text || "(no text)"}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            Cause
            <NativeSelect
              value={label?.cause ?? ""}
              disabled={setCause.isPending}
              onChange={(event) => setCause.mutate(event.target.value)}
            >
              {!label?.cause && (
                <NativeSelectOption value="">{causeName(causes, null)}</NativeSelectOption>
              )}
              {causes.map((cause) => (
                <NativeSelectOption key={cause.id} value={cause.id}>
                  {cause.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          {label?.setBy === "person" && <Badge variant="outline">Set by a person</Badge>}
          {label?.language && <Badge variant="secondary">{LANGUAGE[label.language]}</Badge>}
          {label?.moneyInvolved && <Badge variant="destructive">Money involved</Badge>}
          {label?.setBy === "model" && label.confidence !== undefined && (
            <span className="text-muted-foreground">confidence {percent(label.confidence)}</span>
          )}
        </div>
        {label?.needsPersonReason && (
          <p className="text-sm text-muted-foreground">
            Left for a person: {label.needsPersonReason}.
          </p>
        )}
        {setCause.error && (
          <p role="alert" className="text-sm text-destructive">
            {setCause.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ReplyCard({ answer, path }: { answer: ReviewAnswer; path: string }) {
  const name = useYourName()
  const { draft } = answer
  const [text, setText] = useState(draft?.text ?? "")

  const draftWithClaude = useChange(() => api<Draft>(`${path}/draft`, { method: "POST" }))
  const save = useChange(() =>
    api<Draft>(`${path}/reply`, { method: "PUT", body: { text, by: name } })
  )
  const act = useChange((action: "approve" | "refuse" | "post") =>
    api(`/api/drafts/${draft?.id ?? 0}/${action}`, {
      method: "POST",
      body: action === "refuse" ? { by: name, reason: "" } : { by: name },
    })
  )
  const error = draftWithClaude.error ?? save.error ?? act.error
  const busy = draftWithClaude.isPending || save.isPending || act.isPending
  const edited = text !== (draft?.text ?? "")
  const posted = draft?.status === "posted"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Reply
          {draft && (
            <Badge variant={posted ? "success" : "outline"}>{DRAFT_STATUS[draft.status]}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          aria-label="Reply text"
          rows={5}
          value={text}
          readOnly={posted}
          placeholder="Draft with Claude, or write the reply yourself. It must end with the support channel."
          onChange={(event) => setText(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{Array.from(text).length} / 350 characters</p>
        {draft && draft.broken.length > 0 && !edited && (
          <ul aria-label="Rules broken" className="space-y-1 text-sm text-destructive">
            {draft.broken.map((rule) => (
              <li key={rule.rule}>✗ {rule.detail}</li>
            ))}
          </ul>
        )}
        {draft && draft.broken.length === 0 && !edited && !posted && (
          <p className="text-sm text-success">✓ Keeps every rule</p>
        )}
        {!name && (
          <p className="text-sm text-muted-foreground">
            Type your name at the top to act on replies.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
        {!posted && (
          <div className="flex flex-wrap gap-2">
            {!draft || (draft.status !== "approved" && !edited) ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => draftWithClaude.mutate(undefined)}
              >
                {draft ? "Draft again with Claude" : "Draft with Claude"}
              </Button>
            ) : null}
            {edited && (
              <Button disabled={busy || !name} onClick={() => save.mutate(undefined)}>
                Save {draft?.status === "approved" ? "(cancels the approval)" : ""}
              </Button>
            )}
            {draft?.status === "ready" && !edited && (
              <Button disabled={busy || !name} onClick={() => act.mutate("approve")}>
                Approve this text
              </Button>
            )}
            {draft?.status === "approved" && !edited && (
              <Button disabled={busy || !name} onClick={() => act.mutate("post")}>
                Post
              </Button>
            )}
            {draft && draft.status !== "refused" && !edited && (
              <Button variant="ghost" disabled={busy || !name} onClick={() => act.mutate("refuse")}>
                Refuse
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
