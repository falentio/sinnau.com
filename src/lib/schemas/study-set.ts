import * as v from "valibot";

import { createPrefixedIdSchema } from "./id-schema.ts";

export const STUDY_SET_ID_PREFIX = "sts";

export const STUDY_SET_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;

export const trimmedTitleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(5, "Judul minimal 5 karakter setelah dipangkas"),
  v.maxLength(50, "Judul maksimal 50 karakter")
);

export const descriptionSchema = v.optional(
  v.pipe(v.string(), v.maxLength(2000, "Deskripsi maksimal 2000 karakter"))
);

const filenameSchema = v.pipe(
  v.string(),
  v.maxLength(255, "Setiap nama file maksimal 255 karakter")
);

const filesSchema = v.optional(
  v.pipe(
    v.array(filenameSchema),
    v.maxLength(32, "Maksimal 32 file per study set")
  )
);

const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);

const slugSchema = v.pipe(
  v.string(),
  v.minLength(1, "Slug diperlukan"),
  v.maxLength(255, "Slug maksimal 255 karakter"),
  v.regex(
    /^[a-z0-9-]+$/u,
    "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"
  )
);

const queryParamIntegerSchema = v.pipe(
  v.union([v.string(), v.number()]),
  v.transform((input) => (typeof input === "string" ? Number(input) : input)),
  v.check((input) => !Number.isNaN(input), "Harus berupa angka yang valid"),
  v.integer(),
  v.minValue(1)
);

const paginationSchema = v.optional(
  v.object({
    orderBy: v.optional(v.picklist(["createdAt", "updatedAt", "newlyOpened"])),
    orderDirection: v.optional(v.picklist(["asc", "desc"])),
    page: v.optional(queryParamIntegerSchema),
  })
);

const visibilitySchema = v.picklist(STUDY_SET_VISIBILITIES);

export const createStudySetInputSchema = v.object({
  description: descriptionSchema,
  files: filesSchema,
  title: trimmedTitleSchema,
  visibility: v.optional(visibilitySchema),
});

export const updateStudySetInputSchema = v.object({
  description: v.optional(
    v.union([v.pipe(v.string(), v.maxLength(2000)), v.literal(""), v.null()])
  ),
  files: v.optional(v.array(filenameSchema)),
  id: studySetIdSchema,
  title: v.optional(trimmedTitleSchema),
  visibility: v.optional(visibilitySchema),
});

export const deleteStudySetInputSchema = v.object({
  id: studySetIdSchema,
});

export const getStudySetsInputSchema = v.object({
  pagination: paginationSchema,
});

export const getStudySetInputSchema = v.union([
  v.object({ id: studySetIdSchema }),
  v.object({ slug: slugSchema }),
]);

export const refreshStudySetVisitInputSchema = v.object({
  studySetId: studySetIdSchema,
});

export const getRecentStudySetsInputSchema = v.object({
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
});

const visibilityOutputSchema = v.picklist(STUDY_SET_VISIBILITIES);

export const studySetSchema = v.object({
  createdAt: v.date(),
  deletedAt: v.nullable(v.date()),
  description: v.nullable(v.string()),
  files: v.array(v.string()),
  id: v.string(),
  isAiGenerated: v.optional(v.boolean(), false),
  ownerId: v.string(),
  slug: v.string(),
  title: v.string(),
  updatedAt: v.date(),
  visibility: visibilityOutputSchema,
});

const paginationOutputSchema = v.object({
  limit: v.number(),
  page: v.number(),
  total: v.number(),
  totalPages: v.number(),
});

export const studySetListResultSchema = v.object({
  data: v.array(studySetSchema),
  pagination: paginationOutputSchema,
});

export const studySetDeleteOutputSchema = v.object({
  success: v.literal(true),
});

export const restoreStudySetInputSchema = v.object({
  id: studySetIdSchema,
});

export const restoreStudySetOutputSchema = studySetSchema;

export const studySetRefreshVisitOutputSchema = v.object({
  visitedAt: v.number(),
});
export const studySetAdminCleanupVisitsOutputSchema = v.object({
  deletedCount: v.number(),
});

export type CreateStudySetInput = v.InferOutput<
  typeof createStudySetInputSchema
>;
export type UpdateStudySetInput = v.InferOutput<
  typeof updateStudySetInputSchema
>;
export type DeleteStudySetInput = v.InferOutput<
  typeof deleteStudySetInputSchema
>;
export type RestoreStudySetInput = v.InferOutput<
  typeof restoreStudySetInputSchema
>;
export type GetStudySetsInput = v.InferOutput<typeof getStudySetsInputSchema>;
export type GetStudySetInput = v.InferOutput<typeof getStudySetInputSchema>;
export type RefreshStudySetVisitInput = v.InferOutput<
  typeof refreshStudySetVisitInputSchema
>;
export type GetRecentStudySetsInput = v.InferOutput<
  typeof getRecentStudySetsInputSchema
>;
