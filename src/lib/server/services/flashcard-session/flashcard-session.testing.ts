import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import {
  FLASHCARD_SESSION_ID_PREFIX,
  FLASHCARD_SESSION_REVIEW_ID_PREFIX,
} from "$lib/schemas/flashcard-session.constant";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { flashcard } from "$lib/server/infras/db/schema/flashcard";
import {
  flashcardSession,
  flashcardState,
} from "$lib/server/infras/db/schema/flashcard-session";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type {
  FlashcardCardState,
  FlashcardSession,
  FlashcardSessionReview,
} from "../../infras/db/schema/flashcard-session.ts";
import type { Flashcard } from "../../infras/db/schema/flashcard.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import { FlashcardSessionDrizzleRepository } from "./flashcard-session.repository.drizzle.ts";
import type { FlashcardSessionRepository } from "./flashcard-session.repository.ts";

export type MockedFlashcardSessionRepository = {
  [K in keyof FlashcardSessionRepository]: MockedFunction<
    FlashcardSessionRepository[K]
  >;
};

export const createMockRepository = (): MockedFlashcardSessionRepository => ({
  countIntroducedToday:
    vi.fn<FlashcardSessionRepository["countIntroducedToday"]>(),
  deleteExpiredSessions:
    vi.fn<FlashcardSessionRepository["deleteExpiredSessions"]>(),
  findFlashcardsForQueue:
    vi.fn<FlashcardSessionRepository["findFlashcardsForQueue"]>(),
  findSessionById: vi.fn<FlashcardSessionRepository["findSessionById"]>(),
  findSessionByUserAndStudySet:
    vi.fn<FlashcardSessionRepository["findSessionByUserAndStudySet"]>(),
  findStateByKey: vi.fn<FlashcardSessionRepository["findStateByKey"]>(),
  getOrCreateSession: vi.fn<FlashcardSessionRepository["getOrCreateSession"]>(),
  insertReviewWithState:
    vi.fn<FlashcardSessionRepository["insertReviewWithState"]>(),
  listReviewsByStudySet:
    vi.fn<FlashcardSessionRepository["listReviewsByStudySet"]>(),
  listSessionsForAdmin:
    vi.fn<FlashcardSessionRepository["listSessionsForAdmin"]>(),
  listSessionsForUser:
    vi.fn<FlashcardSessionRepository["listSessionsForUser"]>(),
  updateSessionTouch: vi.fn<FlashcardSessionRepository["updateSessionTouch"]>(),
});

export type MockedFlashcardSessionGuard = {
  [K in keyof FlashcardSessionGuard]: MockedFunction<FlashcardSessionGuard[K]>;
};

export const createMockGuard = (): MockedFlashcardSessionGuard => ({
  assertFlashcardBelongsToStudySetOrNotFound:
    vi.fn<
      FlashcardSessionGuard["assertFlashcardBelongsToStudySetOrNotFound"]
    >(),
  assertSessionOwnerOrNotFound:
    vi.fn<FlashcardSessionGuard["assertSessionOwnerOrNotFound"]>(),
  assertStudySetVisibleOrNotFound:
    vi.fn<FlashcardSessionGuard["assertStudySetVisibleOrNotFound"]>(),
  requireUser: vi.fn<FlashcardSessionGuard["requireUser"]>(),
});

export const createFlashcardSessionFixture = (
  overrides: Partial<FlashcardSession> = {}
): FlashcardSession => ({
  createdAt: new Date(),
  id: generateId(FLASHCARD_SESSION_ID_PREFIX),
  studySetId: generateId(STUDY_SET_ID_PREFIX),
  updatedAt: new Date(),
  userId: "user-1",
  ...overrides,
});

export const createFlashcardSessionReviewFixture = (
  overrides: Partial<FlashcardSessionReview> = {}
): FlashcardSessionReview => ({
  flashcardId: generateId(FLASHCARD_ID_PREFIX),
  id: generateId(FLASHCARD_SESSION_REVIEW_ID_PREFIX),
  preDifficulty: 5,
  preDue: new Date(),
  preLapses: 0,
  preLastReview: null,
  preLearningSteps: 0,
  preReps: 0,
  preScheduledDays: 0,
  preStability: 2.5,
  preState: "New",
  rating: "Good",
  reviewedAt: new Date(),
  sessionId: generateId(FLASHCARD_SESSION_ID_PREFIX),
  ...overrides,
});

export const createFlashcardCardStateFixture = (
  overrides: Partial<FlashcardCardState> = {}
): FlashcardCardState => ({
  difficulty: 5,
  due: new Date(),
  elapsedDays: 0,
  flashcardId: generateId(FLASHCARD_ID_PREFIX),
  introducedAt: null,
  lapses: 0,
  lastReview: null,
  learningSteps: 0,
  reps: 0,
  scheduledDays: 0,
  stability: 2.5,
  state: "New",
  updatedAt: new Date(),
  userId: "user-1",
  ...overrides,
});

export const createQueueFlashcardWithStateFixture = (
  overrides: Partial<{
    flashcardId: string;
    front: string;
    back: string;
    hint: string | null;
    createdAt: Date;
    state: FlashcardCardState | null;
  }> = {}
) => ({
  back: overrides.back ?? "back",
  createdAt: overrides.createdAt ?? new Date(),
  flashcardId: overrides.flashcardId ?? generateId(FLASHCARD_ID_PREFIX),
  front: overrides.front ?? "front",
  hint: overrides.hint ?? null,
  state: overrides.state === undefined ? null : overrides.state,
});

export const captureError = async <T>(
  promise: Promise<T>
): Promise<Error | null> => {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
};

interface SeedUserOptions {
  id?: string;
  email?: string;
  name?: string;
}

interface SeedStudySetOptions {
  id?: string;
  slug?: string;
  title?: string;
  visibility?: StudySet["visibility"];
  ownerId?: string;
}

interface SeedFlashcardOptions {
  id?: string;
  front?: string;
  back?: string;
  studySetId?: string;
  ownerId?: string;
}

export class FlashcardSessionTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: FlashcardSessionDrizzleRepository;
  readonly ownerId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new FlashcardSessionDrizzleRepository(this.db);
    this.ownerId = this.seedUser({ name: "Owner" });
  }

  seedUser(options: SeedUserOptions = {}): string {
    const id = options.id ?? crypto.randomUUID();
    this.db
      .insert(user)
      .values({
        email: options.email ?? `${id}@test.local`,
        emailVerified: true,
        id,
        name: options.name ?? "Test User",
      })
      .run();
    return id;
  }

  seedStudySet(overrides: SeedStudySetOptions = {}): StudySet {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    this.db
      .insert(studySet)
      .values({
        description: null,
        files: [],
        id,
        ownerId: overrides.ownerId ?? this.ownerId,
        slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
        title: overrides.title ?? "Seeded Set",
        visibility: overrides.visibility ?? "PUBLIC",
      })
      .run();
    const [row] = this.db
      .select()
      .from(studySet)
      .where(eq(studySet.id, id))
      .all();
    if (!row) {
      throw new Error("Failed to seed study set");
    }
    return row;
  }

  seedFlashcard(overrides: SeedFlashcardOptions = {}): Flashcard {
    const id = overrides.id ?? generateId(FLASHCARD_ID_PREFIX);
    this.db
      .insert(flashcard)
      .values({
        back: overrides.back ?? "back",
        createdAt: new Date(),
        front: overrides.front ?? "front",
        hint: null,
        id,
        importance: 0,
        ownerId: overrides.ownerId ?? this.ownerId,
        studySetId: overrides.studySetId ?? generateId(STUDY_SET_ID_PREFIX),
      })
      .run();
    const [row] = this.db
      .select()
      .from(flashcard)
      .where(eq(flashcard.id, id))
      .all();
    if (!row) {
      throw new Error("Failed to seed flashcard");
    }
    return row;
  }

  seedSession(overrides: Partial<FlashcardSession> = {}): FlashcardSession {
    const id = overrides.id ?? generateId(FLASHCARD_SESSION_ID_PREFIX);
    const studySetId = overrides.studySetId ?? generateId(STUDY_SET_ID_PREFIX);
    const userId = overrides.userId ?? this.ownerId;
    if (overrides.studySetId === undefined) {
      this.db
        .insert(studySet)
        .values({
          description: null,
          files: [],
          id: studySetId,
          ownerId: userId,
          slug: `ss-${studySetId.slice(0, 8)}`,
          title: "Auto-seeded",
          visibility: "PUBLIC",
        })
        .run();
    }
    const [row] = this.db
      .insert(flashcardSession)
      .values({
        createdAt: new Date(),
        id,
        studySetId,
        updatedAt: new Date(),
        userId,
      })
      .returning()
      .all();
    if (!row) {
      throw new Error("Failed to seed flashcard session");
    }
    return row;
  }

  seedFlashcardState(row: FlashcardCardState): FlashcardCardState {
    const [inserted] = this.db
      .insert(flashcardState)
      .values(row)
      .returning()
      .all();
    if (!inserted) {
      throw new Error("Failed to seed flashcard state");
    }
    return inserted;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
