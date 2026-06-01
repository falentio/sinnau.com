import * as v from 'valibot';

const STUDY_SET_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

const trimmedTitleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(5, 'Title must be at least 5 characters after trim'),
	v.maxLength(50, 'Title must be at most 50 characters')
);

const descriptionSchema = v.optional(
	v.pipe(v.string(), v.maxLength(2000, 'Description must be at most 2000 characters'))
);

const filenameSchema = v.pipe(
	v.string(),
	v.maxLength(255, 'Each filename must be at most 255 characters')
);

const filesSchema = v.optional(
	v.pipe(v.array(filenameSchema), v.maxLength(32, 'At most 32 files per study set'))
);

const uuidSchema = v.pipe(v.string(), v.uuid());

const slugSchema = v.pipe(
	v.string(),
	v.minLength(1, 'Slug is required'),
	v.maxLength(255, 'Slug must be at most 255 characters'),
	v.regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens')
);

const paginationSchema = v.optional(
	v.object({
		orderBy: v.optional(v.picklist(['createdAt', 'updatedAt'])),
		orderDirection: v.optional(v.picklist(['asc', 'desc'])),
		page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)))
	})
);

const visibilitySchema = v.picklist(STUDY_SET_VISIBILITIES);

export const createStudySetInputSchema = v.object({
	title: trimmedTitleSchema,
	description: descriptionSchema,
	visibility: v.optional(visibilitySchema),
	files: filesSchema
});

export const updateStudySetInputSchema = v.object({
	id: uuidSchema,
	title: v.optional(trimmedTitleSchema),
	description: v.optional(
		v.union([v.pipe(v.string(), v.maxLength(2000)), v.literal(''), v.null()])
	),
	visibility: v.optional(visibilitySchema),
	files: v.optional(v.array(filenameSchema))
});

export const deleteStudySetInputSchema = v.object({
	id: uuidSchema
});

export const getStudySetsInputSchema = v.object({
	pagination: paginationSchema
});

export const getStudySetInputSchema = v.union([
	v.object({ id: uuidSchema }),
	v.object({ slug: slugSchema })
]);

export const refreshStudySetVisitInputSchema = v.object({
	studySetId: uuidSchema
});

export const getRecentStudySetsInputSchema = v.object({
	count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))
});

const visibilityOutputSchema = v.picklist(STUDY_SET_VISIBILITIES);

export const studySetSchema = v.object({
	id: v.string(),
	slug: v.string(),
	title: v.string(),
	description: v.nullable(v.string()),
	visibility: visibilityOutputSchema,
	ownerId: v.string(),
	files: v.array(v.string()),
	createdAt: v.date(),
	updatedAt: v.date()
});

const paginationOutputSchema = v.object({
	page: v.number(),
	limit: v.number(),
	total: v.number(),
	totalPages: v.number()
});

export const studySetListResultSchema = v.object({
	data: v.array(studySetSchema),
	pagination: paginationOutputSchema
});

export const studySetDeleteOutputSchema = v.object({ success: v.literal(true) });
export const studySetRefreshVisitOutputSchema = v.object({ visitedAt: v.number() });
export const studySetAdminCleanupVisitsOutputSchema = v.object({ deletedCount: v.number() });

export type CreateStudySetInput = v.InferOutput<typeof createStudySetInputSchema>;
export type UpdateStudySetInput = v.InferOutput<typeof updateStudySetInputSchema>;
export type DeleteStudySetInput = v.InferOutput<typeof deleteStudySetInputSchema>;
export type GetStudySetsInput = v.InferOutput<typeof getStudySetsInputSchema>;
export type GetStudySetInput = v.InferOutput<typeof getStudySetInputSchema>;
export type RefreshStudySetVisitInput = v.InferOutput<typeof refreshStudySetVisitInputSchema>;
export type GetRecentStudySetsInput = v.InferOutput<typeof getRecentStudySetsInputSchema>;
