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
import { studySetDrizzleRepository } from './study-set.repository.drizzle.ts';
import type { StudySetListResult, StudySetRepository } from './study-set.repository.ts';
import { StudySetGuard } from './study-set.guard.ts';

export type { StudySet, StudySetVisibility };

export class StudySetService {
	private readonly guard: StudySetGuard;

	constructor(
		private readonly repo: StudySetRepository = studySetDrizzleRepository,
		guard: StudySetGuard = new StudySetGuard(repo)
	) {
		this.guard = guard;
	}

	async createStudySet(
		input: CreateStudySetInput,
		ownerId: string | null | undefined
	): Promise<StudySet> {
		const owner = this.guard.requireOwner(ownerId);

		const slug = await generateSlug(input.title, (candidate) =>
			this.repo.isSlugTaken(candidate)
		).catch((err) => {
			if (err instanceof SlugConflictError) {
				throw new ORPCError('STUDY_SET_SLUG_CONFLICT', { message: err.message });
			}
			throw err;
		});

		return this.repo.insertStudySet({
			id: crypto.randomUUID(),
			slug,
			title: input.title,
			description: input.description ?? null,
			visibility: (input.visibility ?? STUDY_SET_DEFAULT_VISIBILITY) satisfies StudySetVisibility,
			ownerId: owner,
			files: input.files ?? []
		});
	}

	async updateStudySet(
		input: UpdateStudySetInput,
		ownerId: string | null | undefined
	): Promise<StudySet> {
		const owner = this.guard.requireOwner(ownerId);
		const existing = await this.guard.assertOwnerOrForbidden(input.id, owner);

		const patch: Partial<StudySet> = {};
		if (input.title !== undefined) patch.title = input.title;
		if (input.description !== undefined) {
			patch.description =
				input.description === '' || input.description === null ? null : input.description;
		}
		if (input.visibility !== undefined) patch.visibility = input.visibility;
		if (input.files !== undefined) patch.files = input.files;

		if (Object.keys(patch).length === 0) {
			return existing;
		}

		const updated = await this.repo.updateStudySet(input.id, owner, patch);
		if (!updated) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
		return updated;
	}

	async deleteStudySet(
		input: DeleteStudySetInput,
		ownerId: string | null | undefined
	): Promise<void> {
		const owner = this.guard.requireOwner(ownerId);
		const ok = await this.repo.deleteStudySet(input.id, owner);
		if (!ok) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
	}

	async getStudySets(
		input: GetStudySetsInput,
		ownerId: string | null | undefined
	): Promise<StudySetListResult> {
		const owner = this.guard.requireOwner(ownerId);
		const orderBy = input.pagination?.orderBy ?? 'createdAt';
		const orderDirection = input.pagination?.orderDirection ?? 'desc';
		const page = input.pagination?.page ?? 1;
		return this.repo.findOwnedStudySets(owner, orderBy, orderDirection, page);
	}

	async getStudySet(input: GetStudySetInput, userId: string | null | undefined): Promise<StudySet> {
		const user = this.guard.requireUser(userId);
		return 'id' in input
			? this.guard.assertVisibleByIdOrNotFound(input.id, user)
			: this.guard.assertVisibleBySlugOrNotFound(input.slug, user);
	}

	async refreshStudySetVisit(
		input: RefreshStudySetVisitInput,
		userId: string | null | undefined
	): Promise<{ visitedAt: number }> {
		const user = this.guard.requireUser(userId);
		await this.guard.assertVisibleByIdOrNotFound(input.studySetId, user);
		const visitedAt = Date.now();
		await this.repo.upsertVisit(user, input.studySetId, visitedAt);
		return { visitedAt };
	}

	async getRecentStudySets(
		input: GetRecentStudySetsInput,
		userId: string | null | undefined
	): Promise<StudySet[]> {
		const user = this.guard.requireUser(userId);
		return this.repo.findRecentVisits(user, input.count);
	}

	async cleanupOldStudySetVisits(): Promise<{ deletedCount: number }> {
		const cutoff = Date.now() - STUDY_SET_VISIT_TTL_MS;
		const deletedCount = await this.repo.deleteOldVisits(cutoff);
		return { deletedCount };
	}
}

export const studySetService = new StudySetService();
