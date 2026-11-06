import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type Anthropic from "@anthropic-ai/sdk"
import { describe, expect, it } from "vitest"

import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { ClaudeSorter, SORT_MODEL } from "../src/model/claude.ts"
import { loadRecordings, RecordedSorter, RecordingSorter } from "../src/model/recorded.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"

const input = { text: "Ayaw mag open ng app", stars: 1, appVersion: "4.2.0" }

/** A stand-in Claude client that answers `text` and remembers the request. */
function stubClient(text: string, stopReason = "end_turn") {
  const requests: unknown[] = []
  const client = {
    messages: {
      parse: (params: unknown) => {
        requests.push(params)
        return Promise.resolve({ stop_reason: stopReason, content: [{ type: "text", text }] })
      },
    },
  } as unknown as Anthropic
  return { client, requests }
}

describe("ClaudeSorter", () => {
  it("d4_sends_haiku_only_the_review_text_stars_and_version", async () => {
    const { client, requests } = stubClient(confident("crash"))

    const answer = await new ClaudeSorter(client).sort(input, FINANCE_CAUSES)

    expect(answer).toBe(confident("crash"))
    const request = requests[0] as {
      model: string
      messages: { content: string }[]
      output_config: { effort: string }
    }
    expect(request.model).toBe(SORT_MODEL)
    expect(request.output_config.effort).toBe("low")
    expect(request.messages).toEqual([
      { role: "user", content: `<review>\n${JSON.stringify(input)}\n</review>` },
    ])
  })

  it("b2_a_refused_or_cut_off_answer_comes_back_empty_for_a_person", async () => {
    for (const stop of ["refusal", "max_tokens"]) {
      const { client } = stubClient(confident("crash"), stop)
      expect(await new ClaudeSorter(client).sort(input, FINANCE_CAUSES)).toBe("")
    }
  })
})

describe("recorded answers", () => {
  it("b4_answers_recorded_from_one_sorter_replay_without_it", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "rta-")), "recorded.json")
    await new RecordingSorter(new FakeSorter(() => confident("crash")), file).sort(input, FINANCE_CAUSES)
    const recordings = loadRecordings(file)
    if (!recordings) throw new Error("nothing was recorded")

    const replayed = new RecordedSorter(recordings)

    expect(await replayed.sort(input, FINANCE_CAUSES)).toBe(confident("crash"))
    expect(replayed.model).toBe("fake-sorter")
    await expect(replayed.sort({ ...input, text: "something else" }, FINANCE_CAUSES)).rejects.toThrow(
      /no recorded/,
    )
  })
})
