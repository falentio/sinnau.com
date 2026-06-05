import type { StudySet, StudySetVisibility } from '../../infras/db/schema/study-set.ts';

let stubs: StudySet[] | null = null;

export function getStudySetStubs(
	count: number,
	page: number,
	limit: number,
	ownerId: string
): {
	studySets: StudySet[];
	pagination: { page: number; limit: number; total: number; totalPages: number };
} {
	if (!stubs) {
		const now = new Date();
		stubs = Array.from({ length: count }, (_, i) => ({
			id: `sts_stub${String(i + 1).padStart(2, '0')}`,
			slug: `stub-study-set-${i + 1}`,
			title: `Modul Pembelajaran ${i + 1}`,
			description: i % 3 === 0 ? `Deskripsi modul belajar nomor ${i + 1}` : null,
			visibility: (i % 5 === 0 ? 'PRIVATE' : 'PUBLIC') as StudySetVisibility,
			ownerId,
			files: [],
			createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
			updatedAt: new Date(now.getTime() - (count - i) * 1_800_000)
		}));
	}

	const start = (page - 1) * limit;
	return {
		studySets: stubs.slice(start, start + limit),
		pagination: {
			page,
			limit,
			total: stubs.length,
			totalPages: Math.ceil(stubs.length / limit)
		}
	};
}
