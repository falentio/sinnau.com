# Grill: AI Generation Observability Logging

> Status: **IN PROGRESS** — being resolved one branch at a time.
> Goal: Add meaningful, structured logging across the AI generation pipeline
> (`src/lib/server/infras/generate/` + `src/lib/server/services/generate/`)
> so we can observe cost (tokens), latency, success/failure rates, and debug
> regressions. Logs flow through logtape → console (dev pretty / prod JSON) + Axiom.

## Current state (what exists today)

| Location                                | What it logs                                              | Gap                                                                   |
| --------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `infras/ai.ts`                          | `debug` — AI request body **keys** + `thinking` flag only | No usage, latency, finish reason, model id                            |
| `infras/generate/generate.ts`           | **nothing**                                               | Core orchestrator is a black box                                      |
| `services/generate/generate.service.ts` | `error` on LLM failure (message only)                     | No start/finish metrics, no token/latency, no status-transition trace |

Logger categories in use: `["sinnau.com", "ai", "util"]`, `["sinnau.com", "generate", "service"]`.
Axiom `toAxiomEvent` flattens a record to: `category`, `level`, `message`, `properties`, `service{name,version,sha,buildDate}`. `properties` is a free `Record<string, unknown>` (nested objects OK).

## Design tree (branches to resolve)

```
add generation logging
├── 1. Correlation identity        ← how to tie infra logs to one run?
├── 2. Sensitive-data boundary     ← what MUST never hit logs?
├── 3. Granularity / volume        ← per-chunk logs, or aggregate only?
├── 4. Log levels                  ← debug vs info vs warn vs error
├── 5. Metrics captured            ← tokens(incl cache), latency, steps, model, finish
├── 6. AI SDK hook                 ← onFinish/telemetry per step, or aggregate only?
├── 7. Logger categories/placement ← which logger where
├── 8. Error detail                ← include stack? message truncation?
└── 9. Axiom shape                 ← nested properties ok? flatten?
```

---

## Open decisions (the grill)

### Q1 — Correlation identity [OPEN]

The infra `generate()` orchestrator (`infras/generate/generate.ts`) currently has **no**
`generateId`/run id, so its logs can't be correlated to a specific generation. The service
layer has `generateId` but doesn't pass it down.

- **A (recommended):** Thread `generateId` (or a generic `runId`) through `GenerateOptions`
  / `GenerateDeps` and include it in every infra log call's `properties`. Service already
  owns `generateId`, so cost is one extra param.
- **B:** Don't correlate infra logs; rely on timestamps only.
- **C:** Use `AsyncLocalStorage` request context so the logger auto-attaches `runId`
  without threading params. Cleaner calls, but adds a context primitive + wiring.

> My pick: **A** — simplest, explicit, and `generateId` is the natural correlation key.
> (C is nicer long-term but heavier; only worth it if we expect more cross-cutting
> correlation later.)

**Decision:** **A** — thread `generateId` through `GenerateOptions`/`GenerateDeps`,
include it in every infra log's `properties`.

---

### Q2 — Sensitive-data boundary [OPEN]

Confirm the hard rule for what must NEVER be logged.

- **A (recommended):** Never log PDF text, raw `content`, or generated question/flashcard
  text. Log only: lengths, chunk counts, content-hash (optional), slugs count, token counts.
- **B:** Allow logging generated text at `debug` (high volume, risky for PII in study docs).
- **C:** Log a content hash (sha256) of the PDF + each chunk for dedup/debugging.

> My pick: **A**, optionally **C** for the input PDF only (not per-chunk, not outputs).

**Decision:** **A** — never log PDF text, raw content, or generated output text. Log
lengths, counts, token counts, slug counts only.

---

### Q3 — Granularity / volume [OPEN]

Generation splits content into many chunks (default `chunkSize=13000`, `groupSize=3`), run
in parallel groups — potentially dozens of chunk logs per run.

- **A (recommended):** Per-chunk logs at `debug` (start, skip-if-done, token-limit-break,
  finish-success, finish-failure). Aggregate summary at `info`.
- **B:** Only aggregate `info` logs; no per-chunk logging at all.
- **C:** Per-chunk at `info` (noisy in prod / Axiom cost).

> My pick: **A** — debug keeps prod quiet but lets us drill into a run when needed.

**Decision:** **A** — per-chunk `debug` logs (start/skip/token-break/success/failure);
aggregate run summary at `info`.

---

### Q4 — Log levels [OPEN]

Proposed mapping (confirm / adjust):

| Event                                                     | Level                                      |
| --------------------------------------------------------- | ------------------------------------------ |
| Per-chunk start / skip / token-break                      | `debug`                                    |
| Per-chunk success (with token usage)                      | `debug`                                    |
| Per-chunk failure (error summary)                         | `debug` (full error surfaced at run level) |
| Run start (plan: chunks, model, extractionType)           | `info`                                     |
| Run summary (totals, token usage, failed count, duration) | `info`                                     |
| Token-limit reached (`isTokenLimitReached`)               | `warn`                                     |
| Run-level LLM error / FAILED status                       | `error`                                    |
| Finalize transaction start/finish                         | `info` / `debug`                           |

**Decision:** **A** — adopt the proposed level table as written.

---

### Q5 — Metrics captured [OPEN]

What fields should every generation log carry?

- **A (recommended) — full set:** `generateId`, `modelId`, `provider`, `extractionType`,
  `languageStyle`, `chunkSize`, `groupSize`, `maxSteps`, `maxTokens`, per-chunk + totals:
  `inputTokens`, `outputTokens`, `reasoningTokens`, `cacheReadTokens`, `cacheWriteTokens`,
  `stepCount`, `durationMs`, `failedChunks`, `isTokenLimitReached`.
- **B:** Minimal — tokens + duration + success/fail only.

> My pick: **A** — cost + latency + quality all need these; cheap to emit.

**Decision:** **A** — full metric set (cost + latency + quality fields).

---

### Q6 — AI SDK hook [OPEN]

The Vercel AI SDK `generateText` supports `onFinish` (per step) and
`experimental_telemetry`. We currently only read `result.totalUsage` + `result.steps.length`
at the end of each chunk.

- **A (recommended):** Keep aggregate-at-end (`totalUsage` + `steps.length`) — already
  available, no extra wiring, covers cost/latency per chunk.
- **B:** Add `onFinish` per step to capture per-step `finishReason`, per-step usage, and
  per-step latency for finer observability.
- **C:** Enable `experimental_telemetry` (OpenTelemetry) — heaviest, needs an OTel setup.

> My pick: **A** for now; **B** only if we need per-step `finishReason` (e.g. to spot
> `length`/`content-filter` stops). Do we?

**Decision:** **A** — aggregate-at-end only (`totalUsage` + `steps.length`); no
per-step `onFinish`/`telemetry` wiring.

---

### Q7 — Logger categories / placement [OPEN]

- **A (recommended):** New infra logger `getLogger(["sinnau.com", "generate", "infra"])` in
  `infras/generate/generate.ts`; keep service logger as-is. Both under the existing
  `["sinnau.com", "generate", ...]` parent so one category filter covers generation.
- **B:** Single logger everywhere.

> My pick: **A** — clean separation, one parent category.

**Decision:** **A** — new infra logger `["sinnau.com", "generate", "infra"]`; service
logger unchanged; both under the `["sinnau.com", "generate", ...]` parent.

---

### Q8 — Error detail [OPEN]

On a chunk/run failure, how much error detail?

- **A (recommended):** Log `error.name` + `error.message` + `chunkIndex` + `generateId`.
  Stack trace: `debug` only (or omitted in prod to protect size / leak internals).
- **B:** Include full stack at `error` level always.

> My pick: **A** — message+name is enough to triage; stacks are noisy in Axiom.

**Decision:** **A** — log `error.name` + `error.message` + `chunkIndex` + `generateId`;
stack trace only at `debug` (omitted in prod).

---

### Q9 — Axiom shape [OPEN]

`properties` accepts nested objects. Do we nest or flatten?

- **A (recommended):** Nest token usage as `tokens: { input, output, reasoning, cacheRead,
cacheWrite }` and timing as `timing: { durationMs }`. Readable in Axiom queries.
- **B:** Flatten everything to top-level `properties` keys.

> My pick: **A** — Axiom handles nested JSON; cleaner dashboards.

**Decision:** **A** — nest token usage (`tokens:{...}`) and timing (`timing:{durationMs}`)
inside `properties`; Axiom handles nested JSON.

---

## Resolution summary

All nine branches resolved to option **A**. The agreed design:

1. **Correlation** — thread `generateId` through `GenerateOptions`/`GenerateDeps`; attach to
   every infra log's `properties`.
2. **Sensitive data** — never log PDF text, raw content, or generated output text. Lengths,
   counts, and token counts only.
3. **Granularity** — per-chunk `debug` logs; aggregate run summary at `info`.
4. **Levels** — per-chunk events `debug`; run start/summary/finalize `info`; token-limit
   `warn`; run error/FAILED `error`.
5. **Metrics** — full set (modelId, provider, extractionType, languageStyle, chunk/group
   sizing, maxSteps/maxTokens, per-chunk + total token breakdown, stepCount, durationMs,
   failedChunks, isTokenLimitReached).
6. **AI SDK** — aggregate-at-end only (`totalUsage` + `steps.length`); no `onFinish`/OTel.
7. **Categories** — new infra logger `["sinnau.com", "generate", "infra"]`; service logger
   unchanged; both under `["sinnau.com", "generate", ...]`.
8. **Errors** — `error.name` + `error.message` + `chunkIndex` + `generateId`; stack at
   `debug` only.
9. **Axiom shape** — nested `tokens:{...}` and `timing:{durationMs}`.

## Implementation plan (derived from the grill)

### `src/lib/server/infras/generate/generate.ts`

- Add `getLogger(["sinnau.com", "generate", "infra"])`.
- Add `generateId` to `GenerateDeps` (and pass through `GenerateOptions` → `generate()`).
- `generate()`:
  - `info` run-start: `generateId, modelId, provider, extractionType, languageStyle,
chunkSize, groupSize, maxSteps, maxTokens, totalChunks, contentLength`.
  - `debug` per-chunk start (`index`), skip-if-done (`index`), token-limit-break.
  - `debug` per-chunk success: `index, stepCount, tokens:{...}`.
  - `debug` per-chunk failure: `index, error:{name,message}` (+ stack at `debug`).
  - `info` run-summary: `generateId, totalChunks, processedChunks, failedChunks:[index...],
tokens(total), stepCount(total), durationMs, isTokenLimitReached`.
  - Measure `durationMs` via `performance.now()` around `generate()` and per chunk.
  - Capture `modelId`/`provider` from `deps.languageModel.modelId` / `.provider`.
- `processChunk` / `processChunkGroup`: take `generateId` from deps and attach to logs.

### `src/lib/server/services/generate/generate.pipeline.defaults.ts`

- Pass `generateId` into `runGenerate(...)` call inside `createRunLLMDefault`.

### `src/lib/server/services/generate/generate.service.ts`

- `info` logs in `runPipeline`: parse start/finish (durationMs), generation
  start/finish (`successCount`/`totalChunkCount`), finalize start/finish, each
  status transition (`ONGOING`/`FAILED`/`COMPLETED`/`PARTIAL_COMPLETED`) with
  `generateId` + durations.
- Upgrade existing `error` log to include `generateId` + parsed `successCount`/`totalChunkCount`.
- Keep `generateId` already in scope — no new threading needed at service layer.

### Test impact

- `generate.repository` / `generate.testing` mocks unaffected (logging is side-effect only).
- `generate.pipeline.defaults` test may need `generateId` arg threaded into the mock
  `runGenerate` if it asserts call shape — verify.
