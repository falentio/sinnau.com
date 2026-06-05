import { STUDY_SET_ID_PREFIX } from '$lib/schemas/study-set';
import {
	STUDY_SET_DEFAULT_VISIBILITY,
	STUDY_SET_VISIT_TTL_MS
} from '$lib/schemas/study-set.constant';
import { ORPCError } from '@orpc/server';
import type {
	CreateStudySetInput,
	DeleteStudySetInput,
	GetRecentStudySetsInput,
	GetStudySetInput,
	GetStudySetsInput,
	RefreshStudySetVisitInput,
	UpdateStudySetInput
} from '../../../schemas/study-set.ts';
import type { StudySet, StudySetVisibility } from '../../infras/db/schema/study-set.ts';
import { generateSlug, SlugConflictError } from '../../infras/slug.ts';
import { generateId } from '../../utils/nanoid.ts';
import type { StudySetGuard } from './study-set.guard.ts';
import type { StudySetListResult, StudySetRepository } from './study-set.repository.ts';

export type { StudySet, StudySetVisibility };

export class StudySetService {
	private readonly guard: StudySetGuard;

	constructor(
		private readonly repo: StudySetRepository,
		guard: StudySetGuard
	) {
		this.guard = guard;
	}

	async createStudySet(input: CreateStudySetInput, ownerId: string): Promise<StudySet> {
		const slug = await generateSlug(input.title, async (candidate) =>
			this.repo.isSlugTaken(candidate)
		).catch((err) => {
			if (err instanceof SlugConflictError) {
				throw new ORPCError('STUDY_SET_SLUG_CONFLICT', { message: err.message });
			}
			throw err;
		});

		return this.repo.insertStudySet({
			id: generateId(STUDY_SET_ID_PREFIX),
			slug,
			title: input.title,
			description: input.description ?? null,
			visibility: (input.visibility ?? STUDY_SET_DEFAULT_VISIBILITY) satisfies StudySetVisibility,
			ownerId,
			files: input.files ?? []
		});
	}

	async updateStudySet(input: UpdateStudySetInput, ownerId: string): Promise<StudySet> {
		const existing = await this.guard.assertOwnerOrForbidden(input.id, ownerId);

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

		const updated = await this.repo.updateStudySet(input.id, ownerId, patch);
		if (!updated) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
		return updated;
	}

	async deleteStudySet(input: DeleteStudySetInput, ownerId: string): Promise<void> {
		const ok = await this.repo.deleteStudySet(input.id, ownerId);
		if (!ok) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
	}

	async getStudySets(input: GetStudySetsInput, ownerId: string): Promise<StudySetListResult> {
		const orderBy = input.pagination?.orderBy ?? 'createdAt';
		const orderDirection = input.pagination?.orderDirection ?? 'desc';
		const page = input.pagination?.page ?? 1;
		return this.repo.findOwnedStudySets(ownerId, orderBy, orderDirection, page);
	}

	async getStudySet(input: GetStudySetInput, userId: string): Promise<StudySet> {
		return 'id' in input
			? this.guard.assertVisibleByIdOrNotFound(input.id, userId)
			: this.guard.assertVisibleBySlugOrNotFound(input.slug, userId);
	}

	async refreshStudySetVisit(
		input: RefreshStudySetVisitInput,
		userId: string
	): Promise<{ visitedAt: number }> {
		await this.guard.assertVisibleByIdOrNotFound(input.studySetId, userId);
		const visitedAt = Date.now();
		await this.repo.upsertVisit(userId, input.studySetId, visitedAt);
		return { visitedAt };
	}

	async getRecentStudySets(input: GetRecentStudySetsInput, userId: string): Promise<StudySet[]> {
		return this.repo.findRecentVisits(userId, input.count);
	}

	async cleanupOldStudySetVisits(): Promise<{ deletedCount: number }> {
		const cutoff = Date.now() - STUDY_SET_VISIT_TTL_MS;
		const deletedCount = await this.repo.deleteOldVisits(cutoff);
		return { deletedCount };
	}
}
