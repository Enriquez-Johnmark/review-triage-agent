import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { CauseName, VersionPoint, WeekBar } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { causeName, percent, weekLabel } from "@/lib/format"

/** Seven fixed colours, in order; past seven causes fold into "Other". */
const SERIES = Array.from({ length: 7 }, (_, index) => `var(--series-${index + 1})`)
const OTHER = "other causes"

const axis = { fontSize: 12, fill: "var(--muted-foreground)" }

/** The causes with the most reviews over the weeks shown keep their own
 *  colour, always the same one for the same cause; the rest are folded. */
export function foldCauses(bars: readonly WeekBar[], causes: readonly CauseName[]) {
  const totals = new Map<string, number>()
  for (const bar of bars)
    for (const [cause, count] of Object.entries(bar.counts))
      totals.set(cause, (totals.get(cause) ?? 0) + count)
  const order = (id: string) => causes.findIndex((cause) => cause.id === id)
  const shown = [...totals.keys()]
    .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || order(a) - order(b))
    .slice(0, totals.size > SERIES.length ? SERIES.length - 1 : SERIES.length)
    .sort((a, b) => order(a) - order(b))
  const folded = totals.size > shown.length
  const rows = bars.map((bar) => {
    const row: Record<string, number | string> = { week: weekLabel(bar.week) }
    for (const [cause, count] of Object.entries(bar.counts)) {
      const key = shown.includes(cause) ? cause : OTHER
      row[key] = Number(row[key] ?? 0) + count
    }
    return row
  })
  return { shown, folded, rows }
}

export function CausesByWeekChart({ bars, causes }: { bars: WeekBar[]; causes: CauseName[] }) {
  const [asTable, setAsTable] = useState(false)
  const { shown, folded, rows } = foldCauses(bars, causes)
  const series = [
    ...shown.map((id, index) => ({ key: id, name: causeName(causes, id), colour: SERIES[index] })),
    ...(folded ? [{ key: OTHER, name: "Other causes", colour: "var(--series-other)" }] : []),
  ]
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center justify-between">
        <span className="font-medium">Causes by week</span>
        <Button variant="ghost" size="sm" onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show the chart" : "Show as a table"}
        </Button>
      </figcaption>
      {asTable ? (
        <DataTable
          headers={["Week", ...series.map((s) => s.name)]}
          rows={rows.map((row) => [
            String(row.week),
            ...series.map((s) => String(row[s.key] ?? 0)),
          ])}
        />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(name: string) => <span className="text-foreground">{name}</span>}
            />
            {series.map((s, index) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="causes"
                fill={s.colour}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={36}
                radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  )
}

export function CrashShareChart({ points }: { points: VersionPoint[] }) {
  const [asTable, setAsTable] = useState(false)
  const rows = points.map((point) => ({ ...point, percent: Math.round(point.share * 100) }))
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center justify-between">
        <span className="font-medium">Share of crash reviews by app version</span>
        <Button variant="ghost" size="sm" onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show the chart" : "Show as a table"}
        </Button>
      </figcaption>
      {asTable ? (
        <DataTable
          headers={["Version", "Crash reviews", "Sorted reviews", "Share"]}
          rows={points.map((p) => [
            p.version,
            String(p.crashes),
            String(p.reviews),
            percent(p.share),
          ])}
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="version"
              tick={axis}
              tickLine={false}
              axisLine={false}
              padding={{ left: 24, right: 24 }}
            />
            <YAxis domain={[0, 100]} unit="%" tick={axis} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, _name, item) => [
                `${String(value)}% (${String((item.payload as VersionPoint).crashes)} of ${String((item.payload as VersionPoint).reviews)})`,
                "Crash reviews",
              ]}
            />
            <Line
              dataKey="percent"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--series-1)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </figure>
  )
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row[0]}>
            {row.map((cell, index) => (
              <TableCell key={headers[index]}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
