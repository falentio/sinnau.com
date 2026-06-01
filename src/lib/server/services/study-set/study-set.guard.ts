import { ORPCError } from '@orpc/server';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import { studySetDrizzleRepository } from './study-set.repository.drizzle.ts';
import type { StudySetRepository } from './study-set.repository.ts';

export class StudySetGuard {
	constructor(private readonly repo: StudySetRepository = studySetDrizzleRepository) {}

	requireOwner(ownerId: string | null | undefined): string {
		if (!ownerId) {
			throw new ORPCError('UNAUTHORIZED', { message: 'Authentication is required' });
		}
		return ownerId;
	}

	requireUser(userId: string | null | undefined): string {
		if (!userId) {
			throw new ORPCError('UNAUTHORIZED', { message: 'Authentication is required' });
		}
		return userId;
	}

	async assertOwnerOrForbidden(id: string, ownerId: string): Promise<StudySet> {
		const set = await this.repo.findStudySetById(id);
		if (!set || set.ownerId !== ownerId) {
			throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a study set you do not own' });
		}
		return set;
	}

	async assertVisibleByIdOrNotFound(id: string, userId: string): Promise<StudySet> {
		const set = await this.repo.findStudySetById(id);
		if (!set || !this.canView(set, userId)) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
		return set;
	}

	async assertVisibleBySlugOrNotFound(slug: string, userId: string): Promise<StudySet> {
		const set = await this.repo.findStudySetBySlug(slug);
		if (!set || !this.canView(set, userId)) {
			throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
		}
		return set;
	}

	canView(set: StudySet, userId: string): boolean {
		return set.visibility === 'PUBLIC' || set.ownerId === userId;
	}
}

export const studySetGuard = new StudySetGuard();
