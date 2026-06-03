# Move Singleton Instantiation to Domain index.ts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all singleton instantiations (repository, guard, service) from individual class-defining files into a central `index.ts` per domain.

**Architecture:** Each domain gets an `index.ts` that imports classes, wires dependency chains (repo → guard → service), and exports the three singleton instances. Class-defining files lose their singleton exports and default constructor parameter values that referenced now-removed singletons. Consumer imports (commands/queries) update from `../<domain>.service` to `../index`.

**Tech Stack:** TypeScript, oRPC

**Dependency order:** `study-set` (root, no deps) → `chapter` + `flashcard` (depend on studySetGuard) → `quiz` (depends on studySetGuard + chapterGuard)

---

### Task 1: Create study-set/index.ts (root domain, no cross-domain deps)

**Files:**

- Create: `src/lib/server/services/study-set/index.ts`

- [ ] **Step 1: Create study-set/index.ts**

```ts
import { StudySetDrizzleRepository } from './study-set.repository.drizzle.ts';
import { StudySetGuard } from './study-set.guard.ts';
import { StudySetService } from './study-set.service.ts';

const studySetRepo = new StudySetDrizzleRepository();
export const studySetGuard = new StudySetGuard(studySetRepo);
export const studySetService = new StudySetService(studySetRepo, studySetGuard);
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la src/lib/server/services/study-set/index.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/study-set/index.ts
git commit -m "feat(study-set): add index.ts with singleton wiring"
```

---

### Task 2: Create chapter/index.ts (depends on studySetGuard)

**Files:**

- Create: `src/lib/server/services/chapter/index.ts`

- [ ] **Step 1: Create chapter/index.ts**

```ts
import { ChapterDrizzleRepository } from './chapter.repository.drizzle.ts';
import { ChapterGuard } from './chapter.guard.ts';
import { ChapterService } from './chapter.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const chapterRepo = new ChapterDrizzleRepository();
export const chapterGuard = new ChapterGuard(chapterRepo, studySetGuard);
export const chapterService = new ChapterService(chapterRepo, chapterGuard);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/chapter/index.ts
git commit -m "feat(chapter): add index.ts with singleton wiring"
```

---

### Task 3: Create flashcard/index.ts (depends on studySetGuard)

**Files:**

- Create: `src/lib/server/services/flashcard/index.ts`

- [ ] **Step 1: Create flashcard/index.ts**

```ts
import { FlashcardDrizzleRepository } from './flashcard.repository.drizzle.ts';
import { FlashcardGuard } from './flashcard.guard.ts';
import { FlashcardService } from './flashcard.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const flashcardRepo = new FlashcardDrizzleRepository();
export const flashcardGuard = new FlashcardGuard(flashcardRepo, studySetGuard);
export const flashcardService = new FlashcardService(flashcardRepo, flashcardGuard);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/flashcard/index.ts
git commit -m "feat(flashcard): add index.ts with singleton wiring"
```

---

### Task 4: Create quiz/index.ts (depends on studySetGuard + chapterGuard)

**Files:**

- Create: `src/lib/server/services/quiz/index.ts`

- [ ] **Step 1: Create quiz/index.ts**

```ts
import { QuizDrizzleRepository } from './quiz.repository.drizzle.ts';
import { QuizGuard } from './quiz.guard.ts';
import { QuizService } from './quiz.service.ts';
import { studySetGuard } from '../study-set/index.ts';
import { chapterGuard } from '../chapter/index.ts';

const quizRepo = new QuizDrizzleRepository();
export const quizGuard = new QuizGuard(quizRepo, studySetGuard, chapterGuard);
export const quizService = new QuizService(quizRepo, quizGuard);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/quiz/index.ts
git commit -m "feat(quiz): add index.ts with singleton wiring"
```

---

### Task 5: Modify study-set class-defining files (remove singletons + defaults)

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.ts:159`
- Modify: `src/lib/server/services/study-set/study-set.guard.ts:3,7,56`
- Modify: `src/lib/server/services/study-set/study-set.service.ts:14,16,20-28,115`

- [ ] **Step 1: Remove singleton from study-set.repository.drizzle.ts**

Delete line 159:

```ts
export const studySetDrizzleRepository = new StudySetDrizzleRepository();
```

- [ ] **Step 2: Remove default and value import from study-set.guard.ts**

Change the imports (lines 1-4) — remove the value import of `studySetDrizzleRepository`:

```ts
import { ORPCError } from '@orpc/server';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetRepository } from './study-set.repository.ts';
```

Change line 7 constructor from:

```ts
constructor(private readonly repo: StudySetRepository = studySetDrizzleRepository) {}
```

to:

```ts
constructor(private readonly repo: StudySetRepository) {}
```

Delete line 56:

```ts
export const studySetGuard = new StudySetGuard();
```

- [ ] **Step 3: Remove default and value imports from study-set.service.ts**

Change the imports (lines 1-16) — remove `studySetDrizzleRepository` value import, change `StudySetGuard` to type-only:

```ts
import { ORPCError } from '@orpc/server';
import { generateSlug, SlugConflictError } from '../../infras/slug.ts';
import type { StudySet, StudySetVisibility } from '../../infras/db/schema/study-set.ts';
import type {
	CreateStudySetInput,
	DeleteStudySetInput,
	GetRecentStudySetsInput,
	GetStudySetInput,
	GetStudySetsInput,
	RefreshStudySetVisitInput,
	UpdateStudySetInput
} from '../../../schemas/study-set.ts';
import { STUDY_SET_DEFAULT_VISIBILITY, STUDY_SET_VISIT_TTL_MS } from './study-set.constant.ts';
import type { StudySetListResult, StudySetRepository } from './study-set.repository.ts';
import type { StudySetGuard } from './study-set.guard.ts';
```

Change lines 20-28 constructor from:

```ts
export class StudySetService {
	private readonly guard: StudySetGuard;

	constructor(
		private readonly repo: StudySetRepository = studySetDrizzleRepository,
		guard: StudySetGuard = new StudySetGuard(repo)
	) {
		this.guard = guard;
	}
```

to:

```ts
export class StudySetService {
	private readonly guard: StudySetGuard;

	constructor(
		private readonly repo: StudySetRepository,
		guard: StudySetGuard
	) {
		this.guard = guard;
	}
```

Delete line 115:

```ts
export const studySetService = new StudySetService();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/study-set/study-set.repository.drizzle.ts src/lib/server/services/study-set/study-set.guard.ts src/lib/server/services/study-set/study-set.service.ts
git commit -m "refactor(study-set): remove singletons and defaults from class files"
```

---

### Task 6: Modify chapter class-defining files (remove singletons + defaults)

**Files:**

- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.ts:84`
- Modify: `src/lib/server/services/chapter/chapter.guard.ts:1-5,7-15,46`
- Modify: `src/lib/server/services/chapter/chapter.service.ts:11,13,17-25,94`

- [ ] **Step 1: Remove singleton from chapter.repository.drizzle.ts**

Delete line 84:

```ts
export const chapterDrizzleRepository = new ChapterDrizzleRepository();
```

- [ ] **Step 2: Remove defaults and value imports from chapter.guard.ts**

Change the imports (lines 1-5) — remove value imports of `chapterDrizzleRepository` and `studySetGuard`:

```ts
import { ORPCError } from '@orpc/server';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { ChapterRepository } from './chapter.repository.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
```

Change lines 7-15 constructor from:

```ts
export class ChapterGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: ChapterRepository = chapterDrizzleRepository,
		studySetGuardInstance: StudySetGuard = studySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}
```

to:

```ts
export class ChapterGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: ChapterRepository,
		studySetGuardInstance: StudySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}
```

Delete line 46:

```ts
export const chapterGuard = new ChapterGuard();
```

- [ ] **Step 3: Remove defaults and value imports from chapter.service.ts**

Change the imports (lines 1-13) — remove `chapterDrizzleRepository` value import, change `ChapterGuard` to type-only:

```ts
import { ORPCError } from '@orpc/server';
import { generateSlug, SlugConflictError } from '../../infras/slug.ts';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type {
	CreateChapterInput,
	DeleteChapterInput,
	GetChapterInput,
	GetChaptersInput,
	UpdateChapterInput
} from '../../../schemas/chapter.ts';
import type { ChapterRepository } from './chapter.repository.ts';
import type { ChapterGuard } from './chapter.guard.ts';
```

Change lines 17-25 constructor from:

```ts
export class ChapterService {
	private readonly guard: ChapterGuard;

	constructor(
		private readonly repo: ChapterRepository = chapterDrizzleRepository,
		guard: ChapterGuard = new ChapterGuard(repo)
	) {
		this.guard = guard;
	}
```

to:

```ts
export class ChapterService {
	private readonly guard: ChapterGuard;

	constructor(
		private readonly repo: ChapterRepository,
		guard: ChapterGuard
	) {
		this.guard = guard;
	}
```

Delete line 94:

```ts
export const chapterService = new ChapterService();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/chapter/chapter.repository.drizzle.ts src/lib/server/services/chapter/chapter.guard.ts src/lib/server/services/chapter/chapter.service.ts
git commit -m "refactor(chapter): remove singletons and defaults from class files"
```

---

### Task 7: Modify flashcard class-defining files (remove singletons + defaults)

**Files:**

- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.ts:105`
- Modify: `src/lib/server/services/flashcard/flashcard.guard.ts:4,5,8-15,91`
- Modify: `src/lib/server/services/flashcard/flashcard.service.ts:11,13,17-25,91`

- [ ] **Step 1: Remove singleton from flashcard.repository.drizzle.ts**

Delete line 105:

```ts
export const flashcardDrizzleRepository = new FlashcardDrizzleRepository();
```

- [ ] **Step 2: Remove defaults and value imports from flashcard.guard.ts**

Change the imports (lines 1-6) — remove value imports of `studySetGuard` and `flashcardDrizzleRepository`:

```ts
import { ORPCError } from '@orpc/server';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import type { FlashcardRepository } from './flashcard.repository.ts';
```

Change lines 8-16 constructor from:

```ts
export class FlashcardGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: FlashcardRepository = flashcardDrizzleRepository,
		studySetGuardInstance: StudySetGuard = studySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}
```

to:

```ts
export class FlashcardGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: FlashcardRepository,
		studySetGuardInstance: StudySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}
```

Delete line 91:

```ts
export const flashcardGuard = new FlashcardGuard();
```

- [ ] **Step 3: Remove defaults and value imports from flashcard.service.ts**

Change the imports (lines 1-13) — remove `flashcardDrizzleRepository` value import, change `FlashcardGuard` to type-only:

```ts
import { ORPCError } from '@orpc/server';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import type {
	CreateFlashcardsInput,
	DeleteFlashcardsInput,
	GetFlashcardInput,
	GetFlashcardsInput,
	UpdateFlashcardInput
} from '../../../schemas/flashcard.ts';
import { FLASHCARD_IMPORTANCE_DEFAULT } from './flashcard.constant.ts';
import type { FlashcardRepository } from './flashcard.repository.ts';
import type { FlashcardGuard } from './flashcard.guard.ts';
```

Change lines 17-25 constructor from:

```ts
export class FlashcardService {
	private readonly guard: FlashcardGuard;

	constructor(
		private readonly repo: FlashcardRepository = flashcardDrizzleRepository,
		guard: FlashcardGuard = new FlashcardGuard(repo)
	) {
		this.guard = guard;
	}
```

to:

```ts
export class FlashcardService {
	private readonly guard: FlashcardGuard;

	constructor(
		private readonly repo: FlashcardRepository,
		guard: FlashcardGuard
	) {
		this.guard = guard;
	}
```

Delete line 91:

```ts
export const flashcardService = new FlashcardService();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/flashcard/flashcard.repository.drizzle.ts src/lib/server/services/flashcard/flashcard.guard.ts src/lib/server/services/flashcard/flashcard.service.ts
git commit -m "refactor(flashcard): remove singletons and defaults from class files"
```

---

### Task 8: Modify quiz class-defining files (remove singletons + defaults)

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.ts:174`
- Modify: `src/lib/server/services/quiz/quiz.guard.ts:4,5,7,10-21,123`
- Modify: `src/lib/server/services/quiz/quiz.service.ts:19,20,27-35,322`

- [ ] **Step 1: Remove singleton from quiz.repository.drizzle.ts**

Delete line 174:

```ts
export const quizDrizzleRepository = new QuizDrizzleRepository();
```

- [ ] **Step 2: Remove defaults and value imports from quiz.guard.ts**

Change the imports (lines 1-8) — remove value imports of `studySetGuard`, `chapterGuard`, and `quizDrizzleRepository`:

```ts
import { ORPCError } from '@orpc/server';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import type { ChapterGuard } from '../chapter/chapter.guard.ts';
import type { Quiz, QuizOption } from '../../infras/db/schema/quiz.ts';
import type { QuizRepository } from './quiz.repository.ts';
```

Change lines 10-21 constructor from:

```ts
export class QuizGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;
	private readonly resolvedChapterGuard: ChapterGuard;

	constructor(
		private readonly repo: QuizRepository = quizDrizzleRepository,
		studySetGuardInstance: StudySetGuard = studySetGuard,
		chapterGuardInstance: ChapterGuard = chapterGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
		this.resolvedChapterGuard = chapterGuardInstance;
	}
```

to:

```ts
export class QuizGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;
	private readonly resolvedChapterGuard: ChapterGuard;

	constructor(
		private readonly repo: QuizRepository,
		studySetGuardInstance: StudySetGuard,
		chapterGuardInstance: ChapterGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
		this.resolvedChapterGuard = chapterGuardInstance;
	}
```

Delete line 123:

```ts
export const quizGuard = new QuizGuard();
```

- [ ] **Step 3: Remove defaults and value imports from quiz.service.ts**

Change the imports (lines 1-21) — remove `QuizGuard` value import and `quizDrizzleRepository` value import, change `QuizGuard` to type-only:

```ts
import { ORPCError } from '@orpc/server';
import type { Quiz, QuizOption, QuizType } from '../../infras/db/schema/quiz.ts';
import type {
	CreateQuizInput,
	CreateQuizOptionsInput,
	DeleteQuizOptionsInput,
	DeleteQuizzesInput,
	GetQuizInput,
	GetQuizzesInput,
	UpdateQuizInput,
	UpdateQuizOptionInput
} from '../../../schemas/quiz.ts';
import {
	FITB_OPTION_EXACT,
	MCQ_OPTION_MAX,
	MCQ_OPTION_MIN,
	MS_OPTION_MAX
} from './quiz.constant.ts';
import type { QuizGuard } from './quiz.guard.ts';
import type { QuizRepository } from './quiz.repository.ts';
```

Change lines 27-35 constructor from:

```ts
export class QuizService {
	private readonly guard: QuizGuard;

	constructor(
		private readonly repo: QuizRepository = quizDrizzleRepository,
		guard: QuizGuard = new QuizGuard(repo)
	) {
		this.guard = guard;
	}
```

to:

```ts
export class QuizService {
	private readonly guard: QuizGuard;

	constructor(
		private readonly repo: QuizRepository,
		guard: QuizGuard
	) {
		this.guard = guard;
	}
```

Delete line 322:

```ts
export const quizService = new QuizService();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/quiz/quiz.repository.drizzle.ts src/lib/server/services/quiz/quiz.guard.ts src/lib/server/services/quiz/quiz.service.ts
git commit -m "refactor(quiz): remove singletons and defaults from class files"
```

---

### Task 9: Update study-set consumer imports (commands + queries)

**Files:**

- Modify: `src/lib/server/services/study-set/commands/study-set.create.ts:3`
- Modify: `src/lib/server/services/study-set/commands/study-set.update.ts:3`
- Modify: `src/lib/server/services/study-set/commands/study-set.delete.ts:3`
- Modify: `src/lib/server/services/study-set/commands/study-set.refresh-visit.ts:6`
- Modify: `src/lib/server/services/study-set/commands/study-set.admin-cleanup-visits.ts:3`
- Modify: `src/lib/server/services/study-set/queries/study-set.list.ts:3`
- Modify: `src/lib/server/services/study-set/queries/study-set.get.ts:3`
- Modify: `src/lib/server/services/study-set/queries/study-set.get-recent.ts:4`

- [ ] **Step 1: Change all 8 import lines**

In each of the 8 files above, change the import line from:

```ts
import { studySetService } from '../study-set.service';
```

to:

```ts
import { studySetService } from '../index';
```

The line number varies per file — for each file, find the line containing `from '../study-set.service'` and change that import path only.

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/study-set/commands/study-set.create.ts src/lib/server/services/study-set/commands/study-set.update.ts src/lib/server/services/study-set/commands/study-set.delete.ts src/lib/server/services/study-set/commands/study-set.refresh-visit.ts src/lib/server/services/study-set/commands/study-set.admin-cleanup-visits.ts src/lib/server/services/study-set/queries/study-set.list.ts src/lib/server/services/study-set/queries/study-set.get.ts src/lib/server/services/study-set/queries/study-set.get-recent.ts
git commit -m "refactor(study-set): update consumer imports to use index.ts"
```

---

### Task 10: Update chapter consumer imports (commands + queries)

**Files:**

- Modify: `src/lib/server/services/chapter/commands/chapter.create.ts:3`
- Modify: `src/lib/server/services/chapter/commands/chapter.update.ts:3`
- Modify: `src/lib/server/services/chapter/commands/chapter.delete.ts:3`
- Modify: `src/lib/server/services/chapter/queries/chapter.list.ts:3`
- Modify: `src/lib/server/services/chapter/queries/chapter.get.ts:3`

- [ ] **Step 1: Change all 5 import lines**

In each of the 5 files above, change the import line from:

```ts
import { chapterService } from '../chapter.service';
```

to:

```ts
import { chapterService } from '../index';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/chapter/commands/chapter.create.ts src/lib/server/services/chapter/commands/chapter.update.ts src/lib/server/services/chapter/commands/chapter.delete.ts src/lib/server/services/chapter/queries/chapter.list.ts src/lib/server/services/chapter/queries/chapter.get.ts
git commit -m "refactor(chapter): update consumer imports to use index.ts"
```

---

### Task 11: Update flashcard consumer imports (commands + queries)

**Files:**

- Modify: `src/lib/server/services/flashcard/commands/flashcard.create.ts:3`
- Modify: `src/lib/server/services/flashcard/commands/flashcard.update.ts:3`
- Modify: `src/lib/server/services/flashcard/commands/flashcard.delete.ts:7`
- Modify: `src/lib/server/services/flashcard/queries/flashcard.list.ts:3`
- Modify: `src/lib/server/services/flashcard/queries/flashcard.get.ts:3`

- [ ] **Step 1: Change all 5 import lines**

In each of the 5 files above, change the import line from:

```ts
import { flashcardService } from '../flashcard.service';
```

to:

```ts
import { flashcardService } from '../index';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/flashcard/commands/flashcard.create.ts src/lib/server/services/flashcard/commands/flashcard.update.ts src/lib/server/services/flashcard/commands/flashcard.delete.ts src/lib/server/services/flashcard/queries/flashcard.list.ts src/lib/server/services/flashcard/queries/flashcard.get.ts
git commit -m "refactor(flashcard): update consumer imports to use index.ts"
```

---

### Task 12: Update quiz consumer imports (commands + queries)

**Files:**

- Modify: `src/lib/server/services/quiz/commands/quiz.create.ts:3`
- Modify: `src/lib/server/services/quiz/commands/quiz.update.ts:3`
- Modify: `src/lib/server/services/quiz/commands/quiz.delete.ts:3`
- Modify: `src/lib/server/services/quiz/commands/quiz.option-create.ts:4`
- Modify: `src/lib/server/services/quiz/commands/quiz.option-update.ts:3`
- Modify: `src/lib/server/services/quiz/commands/quiz.option-delete.ts:3`
- Modify: `src/lib/server/services/quiz/queries/quiz.list.ts:4`
- Modify: `src/lib/server/services/quiz/queries/quiz.get.ts:3`

- [ ] **Step 1: Change all 8 import lines**

In each of the 8 files above, change the import line from:

```ts
import { quizService } from '../quiz.service';
```

to:

```ts
import { quizService } from '../index';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/quiz/commands/quiz.create.ts src/lib/server/services/quiz/commands/quiz.update.ts src/lib/server/services/quiz/commands/quiz.delete.ts src/lib/server/services/quiz/commands/quiz.option-create.ts src/lib/server/services/quiz/commands/quiz.option-update.ts src/lib/server/services/quiz/commands/quiz.option-delete.ts src/lib/server/services/quiz/queries/quiz.list.ts src/lib/server/services/quiz/queries/quiz.get.ts
git commit -m "refactor(quiz): update consumer imports to use index.ts"
```

---

### Task 13: Update AGENTS.md

**Files:**

- Modify: `src/lib/server/services/AGENTS.md`

- [ ] **Step 1: Update the Layout section**

Change lines 8-25 — add `index.ts` to the layout tree and update descriptions:

```markdown

```

src/lib/server/services/<domain>/
├── SPECS.md # domain specs, entity, field rules, error codes
├── index.ts # singleton wiring (repo → guard → service)
├── <domain>.constant.ts # SCREAMING_SNAKE constants
├── <domain>.service.ts # <Domain>Service class (no default instance)
├── <domain>.service.test.ts # service tests with mocked repo + guard
├── <domain>.guard.ts # <Domain>Guard class (no default instance)
├── <domain>.guard.test.ts # guard tests with mocked repo
├── <domain>.repository.ts # <Domain>Repository interface + shared result types
├── <domain>.repository.drizzle.ts # <Domain>DrizzleRepository implementation (no default instance)
├── <domain>.repository.drizzle.test.ts # integration tests against a real (in-memory) DB
├── <domain>.testing.ts # mock factories, fixtures, <Domain>TestEnv
├── <domain>.router.ts # composes commands + queries into a router object
├── commands/
│ ├── <domain>.<action>.ts # one file per command (create, update, delete, ...)
│ └── ...
└── queries/
├── <domain>.<action>.ts # one file per query (get, list, get-recent, ...)
└── ...

```

```

- [ ] **Step 2: Add the index.ts section after the Layout section**

Insert after line 26 (after the layout tree):

````markdown
## Singleton Wiring (index.ts)

Each domain has an `index.ts` that imports the classes, wires the dependency chain (repository → guard → service), and exports the three singleton instances. Class-defining files export only the class, not a default instance. Consumers import singletons from `../index.ts` instead of `../<domain>.service.ts`.

```ts
// study-set/index.ts (root domain, no cross-domain deps)
import { StudySetDrizzleRepository } from './study-set.repository.drizzle.ts';
import { StudySetGuard } from './study-set.guard.ts';
import { StudySetService } from './study-set.service.ts';

const studySetRepo = new StudySetDrizzleRepository();
export const studySetGuard = new StudySetGuard(studySetRepo);
export const studySetService = new StudySetService(studySetRepo, studySetGuard);
```

```ts
// chapter/index.ts (depends on studySetGuard)
import { ChapterDrizzleRepository } from './chapter.repository.drizzle.ts';
import { ChapterGuard } from './chapter.guard.ts';
import { ChapterService } from './chapter.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const chapterRepo = new ChapterDrizzleRepository();
export const chapterGuard = new ChapterGuard(chapterRepo, studySetGuard);
export const chapterService = new ChapterService(chapterRepo, chapterGuard);
```

```ts
// quiz/index.ts (depends on studySetGuard + chapterGuard)
import { QuizDrizzleRepository } from './quiz.repository.drizzle.ts';
import { QuizGuard } from './quiz.guard.ts';
import { QuizService } from './quiz.service.ts';
import { studySetGuard } from '../study-set/index.ts';
import { chapterGuard } from '../chapter/index.ts';

const quizRepo = new QuizDrizzleRepository();
export const quizGuard = new QuizGuard(quizRepo, studySetGuard, chapterGuard);
export const quizService = new QuizService(quizRepo, quizGuard);
```

Rules:

- Dependency order: `study-set` (no cross-deps) → `chapter` + `flashcard` → `quiz`.
- Export all three singleton names: `<domain>Guard`, `<domain>Service`, and the repository instance (as `<domain>DrizzleRepository` or a local variable).
- Cross-domain dependencies import from sibling `index.ts` files, not from individual class files.
````

- [ ] **Step 3: Update the Service Class template section**

Change lines 78-115 (the Service Class code block and rules) — remove the singleton export line and the default constructor values from the template:

````markdown
## Service Class

```ts
// <domain>.service.ts
import { ORPCError } from '@orpc/server';
import type { <Domain> } from '../../infras/db/schema/<domain>.ts';
import type {
    Create<Domain>Input,
    Delete<Domain>Input,
    Get<Domain>Input,
    Get<Domain>sInput,
    Update<Domain>Input
} from '../../../schemas/<domain>.ts';
import { <DOMAIN>_DEFAULT_VISIBILITY } from './<domain>.constant.ts';
import type { <Domain>ListResult, <Domain>Repository } from './<domain>.repository.ts';
import type { <Domain>Guard } from './<domain>.guard.ts';

export type { <Domain> };

export class <Domain>Service {
    private readonly guard: <Domain>Guard;

    constructor(
        private readonly repo: <Domain>Repository,
        guard: <Domain>Guard
    ) {
        this.guard = guard;
    }

    async create<Domain>(input: Create<Domain>Input, ownerId: string | null | undefined): Promise<<Domain>> {
        const owner = this.guard.requireOwner(ownerId);
        // ...domain-specific orchestration (slug generation, defaults, etc.)
        return this.repo.insert<Domain>({ /* ... */ });
    }
    // ...other methods
}
```

Rules:

- The class accepts `repo` and `guard` as constructor parameters with no defaults. Wiring happens in `index.ts`.
- Every public method takes the auth subject (`ownerId` / `userId`) as its **last** argument, typed `string | null | undefined`. The service does not read from `context`; the router passes it in.
- Public methods return the domain entity (or a small `{ count, visitedAt, success }` shape). Never the repository row when they differ.
- Throws `ORPCError` for domain errors. Never throws raw `Error` from a service method (use guard/repository abstractions).
````

- [ ] **Step 4: Update the Guard template section**

Change lines 125-161 (the Guard code block and rules) — remove default constructor values:

````markdown
## Guard

```ts
// <domain>.guard.ts
import { ORPCError } from '@orpc/server';
import type { <Domain> } from '../../infras/db/schema/<domain>.ts';
import type { <Domain>Repository } from './<domain>.repository.ts';

export class <Domain>Guard {
    constructor(private readonly repo: <Domain>Repository) {}

    requireOwner(ownerId: string | null | undefined): string {
        if (!ownerId) throw new ORPCError('UNAUTHORIZED', { message: 'Authentication is required' });
        return ownerId;
    }

    async assertOwnerOrForbidden(id: string, ownerId: string): Promise<<Domain>> {
        const row = await this.repo.find<Domain>ById(id);
        if (!row || row.ownerId !== ownerId) {
            throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a <domain> you do not own' });
        }
        return row;
    }

    async assertVisibleByIdOrNotFound(id: string, userId: string): Promise<<Domain>> { /* ... */ }
    // canView(...) is exposed for places that need the boolean instead of an ORPCError
}
```

Rules:

- All `require*` methods take `string | null | undefined` and throw `UNAUTHORIZED` when falsy. They return the narrowed `string` so the service can use it without a re-check.
- `assert*OrForbidden` and `assert*OrNotFound` return the fetched row. The service reuses it instead of refetching.
- Visibility checks return `NOT_FOUND` (not `FORBIDDEN`) when the caller is not allowed to see the row — prevents leaking existence.
- `canView(set, userId)` is exposed as a plain boolean for places (typically the repository) that need to filter without throwing.
- Guard depends only on the repository interface (type-only import). Wiring happens in `index.ts`.
````

- [ ] **Step 5: Update the Repository template section**

Change lines 191-215 (the Repository code block) — remove the singleton export line:

Remove the `export const <domain>DrizzleRepository = new <Domain>DrizzleRepository();` line from the Drizzle repository template. Change line 199 (constructor) comments: remove mention of "defaults to the module-level `db`" from the Rules.

Change lines 217-223 from:

```
Rules:

- The interface is the source of truth for what the service can ask for. Add a method here first, then implement it in the Drizzle class.
- Methods that "find by unique key" return `Promise<T | null>`. Methods that "mutate a known id" return `Promise<T | null>` for updates and `Promise<boolean>` for deletes so the service can map `null`/`false` to `NOT_FOUND`.
- Mutating methods that need to enforce ownership take `ownerId` as a parameter and include it in the `WHERE` clause. The service is the only caller, and it always passes the already-authorized id.
- Drizzle impl constructor takes a `DB` and defaults to the module-level `db`. `static withDatabase(db)` is a convenience for tests.
- The Drizzle impl never throws `ORPCError`; if `returning()` is empty after an `insert`, throw a plain `Error` — that case is a bug, not a domain error.
```

to:

```
Rules:

- The interface is the source of truth for what the service can ask for. Add a method here first, then implement it in the Drizzle class.
- Methods that "find by unique key" return `Promise<T | null>`. Methods that "mutate a known id" return `Promise<T | null>` for updates and `Promise<boolean>` for deletes so the service can map `null`/`false` to `NOT_FOUND`.
- Mutating methods that need to enforce ownership take `ownerId` as a parameter and include it in the `WHERE` clause. The service is the only caller, and it always passes the already-authorized id.
- Drizzle impl constructor takes a `DB` (defaults to the module-level `db`). `static withDatabase(db)` is a convenience for tests.
- The Drizzle impl never throws `ORPCError`; if `returning()` is empty after an `insert`, throw a plain `Error` — that case is a bug, not a domain error.
```

Also, in the Drizzle code block template (lines 191-215), remove the last line:

```ts
export const <domain>DrizzleRepository = new <Domain>DrizzleRepository();
```

- [ ] **Step 6: Update Router / Command template section**

Change lines 295-309 (the command template code block) — update the import from `../<domain>.service` to `../index`:

Change:

```ts
import { <domain>Service } from '../<domain>.service';
```

to:

```ts
import { <domain>Service } from '../index';
```

Same for the query template (lines 312-325):
Change:

```ts
import { <domain>Service } from '../<domain>.service';
```

to:

```ts
import { <domain>Service } from '../index';
```

- [ ] **Step 7: Update "Adding a New Domain" checklist**

Lines 401-413 — add `index.ts` step after the service step (step 8 becomes step 8, move service to include references to index.ts):

Change line 410 from:

```
8. Add `<domain>.service.ts` orchestrating the above, plus a default instance export.
```

to:

```
8. Add `<domain>.service.ts` orchestrating the above (no default instance).
9. Add `<domain>/index.ts` wiring repo → guard → service and exporting the three singletons.
```

And renumber subsequent steps (9→10, 10→11, 11→12, 12→13, 13→14).

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/services/AGENTS.md
git commit -m "docs: update AGENTS.md for index.ts singleton wiring pattern"
```

---

### Task 14: Verify with typecheck and tests

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors. If errors appear, they will point to files where import paths or types don't match.

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: All tests pass. No test files import singletons — they use explicit construction with mocks — so no test changes were needed.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 4: Commit any fixes if needed, otherwise confirm done**

```bash
git status
```
