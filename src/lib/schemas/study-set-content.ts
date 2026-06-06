import * as v from "valibot";

import { CHAPTER_ID_PREFIX } from "./chapter.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import {
  STUDY_SET_CONTENT_ID_PREFIX,
  STUDY_SET_CONTENT_MAX_LENGTH,
} from "./study-set-content.constant.ts";
import { STUDY_SET_ID_PREFIX } from "./study-set.ts";

const contentIdSchema = createPrefixedIdSchema(STUDY_SET_CONTENT_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const contentStringSchema = v.pipe(
  v.string(),
  v.minLength(1, "Konten tidak boleh kosong"),
  v.maxLength(
    STUDY_SET_CONTENT_MAX_LENGTH,
    `Konten maksimal ${STUDY_SET_CONTENT_MAX_LENGTH} karakter`
  )
);

export const createStudySetContentInputSchema = v.object({
  chapterIds: v.optional(
    v.pipe(v.array(chapterIdSchema), v.maxLength(32, "Maksimal 32 ID bab"))
  ),
  content: contentStringSchema,
  studySetId: studySetIdSchema,
});

export const updateStudySetContentInputSchema = v.object({
  content: contentStringSchema,
  id: contentIdSchema,
});

export const deleteStudySetContentInputSchema = v.object({
  id: contentIdSchema,
});

export const getStudySetContentInputSchema = v.object({
  id: contentIdSchema,
});

export const listStudySetContentInputSchema = v.object({
  studySetId: studySetIdSchema,
});

export const listByChapterStudySetContentInputSchema = v.object({
  chapterId: chapterIdSchema,
});

export const linkChapterToContentInputSchema = v.object({
  chapterId: chapterIdSchema,
  contentId: contentIdSchema,
});

export const unlinkChapterFromContentInputSchema = v.object({
  chapterId: chapterIdSchema,
  contentId: contentIdSchema,
});

export const setContentChaptersInputSchema = v.object({
  chapterIds: v.array(chapterIdSchema),
  contentId: contentIdSchema,
});

export const studySetContentSchema = v.object({
  chapterIds: v.array(v.string()),
  content: v.string(),
  createdAt: v.date(),
  id: v.string(),
  studySetId: v.string(),
  updatedAt: v.date(),
});

export const studySetContentListOutputSchema = v.array(studySetContentSchema);

export const studySetContentDeleteOutputSchema = v.object({
  success: v.literal(true),
});

export const linkChapterOutputSchema = v.object({ success: v.literal(true) });

export type CreateStudySetContentInput = v.InferOutput<
  typeof createStudySetContentInputSchema
>;
export type UpdateStudySetContentInput = v.InferOutput<
  typeof updateStudySetContentInputSchema
>;
export type DeleteStudySetContentInput = v.InferOutput<
  typeof deleteStudySetContentInputSchema
>;
export type GetStudySetContentInput = v.InferOutput<
  typeof getStudySetContentInputSchema
>;
export type ListStudySetContentInput = v.InferOutput<
  typeof listStudySetContentInputSchema
>;
export type ListByChapterStudySetContentInput = v.InferOutput<
  typeof listByChapterStudySetContentInputSchema
>;
export type LinkChapterToContentInput = v.InferOutput<
  typeof linkChapterToContentInputSchema
>;
export type UnlinkChapterFromContentInput = v.InferOutput<
  typeof unlinkChapterFromContentInputSchema
>;
export type SetContentChaptersInput = v.InferOutput<
  typeof setContentChaptersInputSchema
>;
