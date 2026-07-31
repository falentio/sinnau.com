# Plan: Resume Stuck Generations on Startup

## Context

The `generate()` infras function already supports resumption — `processChunkGroup` skips already-processed chunks via `storage.loadChunkResults()`. Chunk results persist in `generate_chunk_result`. However, the integration in `hooks.server.ts` calls `startupRecovery()` which marks all stuck (`CREATED`/`ONGOING`) generations as `FAILED`.

We want to change the integration so stuck generations are **resumed** on startup instead of failed.

## Gap

`runPipeline` needs `languageStyle`, `extractionType`, and `logId` — none are currently persisted. The PDF text is in `generate_input.input`, but these three params are lost on restart.

## Changes

### 1. Schema: `src/lib/server/infras/db/schema/generate.ts`

Add 3 columns to the `generate` table:

```ts
extractionType: text("extraction_type").notNull().default("normal"),
languageStyle: text("language_style").notNull().default("student-friendly"),
logId: text("log_id"),
```

Then run `pnpm db:generate` for migration.

### 2. Repository interface: `generate.repository.ts`

Add:

```ts
findStuckGenerations(): Promise<Generate[]>;
```

### 3. Repository drizzle impl: `generate.repository.drizzle.ts`

Implement `findStuckGenerations`:

```ts
async findStuckGenerations(): Promise<Generate[]> {
  return await this.dbInstance
    .select()
    .from(generate)
    .where(inArray(generate.status, ["CREATED", "ONGOING"]));
}
```

### 4. Service: `generate.service.ts`

**a) `createGenerate`** — pass new fields to `insertGenerate`:

```ts
const generateRow = await this.repo.insertGenerate({
  completedAt: null,
  extractionType: input.extractionType ?? "normal",
  id: newId,
  languageStyle: input.languageStyle ?? "student-friendly",
  logId,
  ownerId: owner,
  startedAt: new Date(),
  status: "CREATED",
  studySetId: studySet.id,
});
```

**b) Replace `startupRecovery` with `startupResume`:**

```ts
async startupResume(): Promise<void> {
  const stuck = await this.repo.findStuckGenerations();
  for (const row of stuck) {
    const inputRow = await this.repo.findGenerateInputByGenerateId(row.id);
    if (!inputRow) {
      await this.repo.updateGenerateStatus(row.id, "FAILED", Date.now());
      continue;
    }
    this.activeOwners.add(row.ownerId);
    const pipelinePromise = this.runPipeline({
      extractionType: row.extractionType,
      generateId: row.id,
      isInputTruncated: inputRow.isInputTruncated,
      languageStyle: row.languageStyle,
      logId: row.logId ?? "",
      ownerId: row.ownerId,
      pdfText: inputRow.input,
      studySetId: row.studySetId,
    });
    waitUntil(
      pipelinePromise.finally(() => {
        this.activeOwners.delete(row.ownerId);
      })
    );
  }
}
```

Keep `startupRecovery` removed (or keep as deprecated — TBD).

**c) `runPipeline`** — handle empty `logId` gracefully in the refund path:

```ts
if (successCount === 0) {
  if (logId) {
    await this.aiLimitService.refund({ logId }, ownerId);
  }
  await this.retryStatusUpdate(gId, "FAILED", Date.now());
  return;
}
```

### 5. Integration: `hooks.server.ts`

```diff
- await generateService.startupRecovery();
+ await generateService.startupResume();
```

### 6. Testing fixtures: `generate.testing.ts`

- Add `findStuckGenerations` to `createMockRepository`
- Update `createGenerateFixture` with new fields (`extractionType`, `languageStyle`, `logId`)
- Update `seedGenerate` to pass new fields

### 7. Tests: `generate.service.test.ts`

- Replace `startupRecovery` describe block with `startupResume` tests:
  - Resumes stuck generations by calling `runPipeline` via `waitUntil`
  - Marks as FAILED when no `generate_input` row exists
  - Adds/removes owner from `activeOwners` during resume
- Update `createGenerate` tests to assert new fields passed to `insertGenerate`

### 8. Repository drizzle tests: `generate.repository.drizzle.test.ts`

- Add test for `findStuckGenerations` returning CREATED/ONGOING rows
- Add test for `findStuckGenerations` excluding terminal statuses

### 9. SPECS.md

- Update "Startup Recovery" section → "Startup Resume"
- Document new columns on `generate` entity
- Update `GenerateRepository` interface listing
- Update `CreateGenerate` flow to mention persisted params

## Files touched

1. `src/lib/server/infras/db/schema/generate.ts` — schema
2. `drizzle/` — generated migration (via `pnpm db:generate`)
3. `src/lib/server/services/generate/generate.repository.ts` — interface
4. `src/lib/server/services/generate/generate.repository.drizzle.ts` — impl
5. `src/lib/server/services/generate/generate.service.ts` — service
6. `src/hooks.server.ts` — integration
7. `src/lib/server/services/generate/generate.testing.ts` — fixtures
8. `src/lib/server/services/generate/generate.service.test.ts` — unit tests
9. `src/lib/server/services/generate/generate.repository.drizzle.test.ts` — integration tests
10. `src/lib/server/services/generate/SPECS.md` — docs
