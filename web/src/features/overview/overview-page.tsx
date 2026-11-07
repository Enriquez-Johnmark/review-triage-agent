import { Link } from "react-router"

import { api } from "@/api/client"
import type { OverviewAnswer } from "@/api/types"
import { useChange, useOverview, useSettings } from "@/app/queries"
import { LoadError } from "@/components/load-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { causeName, percent, weekLabel } from "@/lib/format"

import { CausesByWeekChart, CrashShareChart } from "./charts"

interface FetchAnswer {
  fetched: { added: number; failed: string[] }
  sorted: number
  needsPerson: number
  sortingSkipped: boolean
}

export function OverviewPage() {
  const overview = useOverview()
  const settings = useSettings()
  const fetchNew = useChange(() => api<FetchAnswer>("/api/fetch", { method: "POST" }))
  if (overview.error) return <LoadError error={overview.error} />
  if (!overview.data) return null
  const noApp = settings.data && !settings.data.googlePlayId && !settings.data.appStoreId
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Overview: week of {weekLabel(overview.data.summary.overview.week)}
        </h1>
        <Button
          variant="outline"
          disabled={fetchNew.isPending || noApp}
          onClick={() => fetchNew.mutate(undefined)}
        >
          {fetchNew.isPending ? "Fetching…" : "Fetch new reviews"}
        </Button>
      </div>
      {noApp && (
        <p className="text-sm text-muted-foreground">
          Choose the app to watch on the{" "}
          <Link className="underline" to="/settings">
            settings page
          </Link>
          .
        </p>
      )}
      {fetchNew.data && <FetchResult answer={fetchNew.data} />}
      {fetchNew.error && (
        <p role="alert" className="text-sm text-destructive">
          {fetchNew.error.message}
        </p>
      )}
      <Numbers data={overview.data} />
      <div className="grid gap-4 md:grid-cols-2">
        <TopCauses data={overview.data} />
        <Spikes data={overview.data} />
      </div>
      <Card>
        <CardContent className="space-y-8">
          <CausesByWeekChart bars={overview.data.causesByWeek} causes={overview.data.causes} />
          <CrashShareChart points={overview.data.crashShareByVersion} />
        </CardContent>
      </Card>
    </section>
  )
}

function FetchResult({ answer }: { answer: FetchAnswer }) {
  return (
    <p className="text-sm" role="status">
      {answer.fetched.added} new reviews
      {answer.sortingSkipped
        ? "; not sorted, because the API key isn't set."
        : `; ${answer.sorted} sorted, ${answer.needsPerson} left for a person.`}
      {answer.fetched.failed.map((failure) => (
        <span key={failure} className="block text-destructive">
          {failure}
        </span>
      ))}
    </p>
  )
}

function Numbers({ data }: { data: OverviewAnswer }) {
  const week = data.summary.overview
  const tiles: { label: string; value: string; note?: string; to?: string }[] = [
    { label: "Reviews this week", value: String(week.reviews), to: `/reviews?week=${week.week}` },
    {
      label: "Answered",
      value: week.shareAnswered === null ? "—" : percent(week.shareAnswered),
      note:
        week.shareAnswered === null
          ? "the stores don't say"
          : `${week.answered} of ${week.replyKnown}`,
    },
    {
      label: "Waiting for a person",
      value: String(week.needsPerson),
      to: `/reviews?week=${week.week}&waiting=needs_person`,
    },
    {
      label: "Not sorted yet",
      value: String(week.unsorted),
      to: `/reviews?week=${week.week}&waiting=unsorted`,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {tile.to ? (
                <Link className="hover:underline" to={tile.to}>
                  {tile.label}
                </Link>
              ) : (
                tile.label
              )}
            </p>
            <p className="text-3xl font-semibold tabular-nums">{tile.value}</p>
            {tile.note && <p className="text-xs text-muted-foreground">{tile.note}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TopCauses({ data }: { data: OverviewAnswer }) {
  const week = data.summary.overview
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top causes this week</CardTitle>
      </CardHeader>
      <CardContent>
        {week.topCauses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sorted reviews this week yet.</p>
        ) : (
          <ol className="space-y-2">
            {week.topCauses.map((top) => (
              <li key={top.cause} className="flex justify-between gap-2">
                <Link
                  className="hover:underline"
                  to={`/reviews?cause=${top.cause}&week=${week.week}`}
                >
                  {causeName(data.causes, top.cause)}
                </Link>
                <span className="text-muted-foreground tabular-nums">{top.count}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function Spikes({ data }: { data: OverviewAnswer }) {
  const { weeklySpikes, versionSpikes } = data.summary
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spikes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {weeklySpikes.length === 0 && versionSpikes.length === 0 && (
          <p className="text-muted-foreground">No spikes.</p>
        )}
        <ul className="space-y-2">
          {weeklySpikes.slice(0, 5).map((spike) => (
            <li key={`${spike.cause}:${spike.week}`}>
              <Link
                className="hover:underline"
                to={`/reviews?cause=${spike.cause}&week=${spike.week}`}
              >
                {causeName(data.causes, spike.cause)}, week of {weekLabel(spike.week)}
              </Link>
              <span className="text-muted-foreground">
                : {spike.count} reviews, against {spike.previousAverage.toFixed(1)} a week before
              </span>
            </li>
          ))}
          {versionSpikes.slice(0, 5).map((spike) => (
            <li key={spike.version}>
              <Link
                className="hover:underline"
                to={`/reviews?cause=crash&version=${encodeURIComponent(spike.version)}`}
              >
                Crashes in version {spike.version}
              </Link>
              <span className="text-muted-foreground">
                : {percent(spike.crashShare)} of its reviews, against{" "}
                {percent(spike.previousCrashShare)} in {spike.previousVersion}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
