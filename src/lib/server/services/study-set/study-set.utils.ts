import type {
  StudySet,
  StudySetVisibility,
} from "../../infras/db/schema/study-set.ts";

let stubs: StudySet[] | null = null;

export const getStudySetStubs = (
  count: number,
  page: number,
  limit: number,
  ownerId: string
): {
  studySets: StudySet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} => {
  if (!stubs) {
    const now = new Date();
    stubs = Array.from({ length: count }, (_, i) => ({
      createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
      description:
        i % 3 === 0 ? `Deskripsi modul belajar nomor ${i + 1}` : null,
      files: [],
      id: `sts_stub${String(i + 1).padStart(2, "0")}`,
      ownerId,
      slug: `stub-study-set-${i + 1}`,
      title: `Modul Pembelajaran ${i + 1}`,
      updatedAt: new Date(now.getTime() - (count - i) * 1_800_000),
      visibility: (i % 5 === 0 ? "PRIVATE" : "PUBLIC") as StudySetVisibility,
    }));
  }

  const effective = stubs.slice(0, count);
  const start = (page - 1) * limit;
  return {
    pagination: {
      limit,
      page,
      total: effective.length,
      totalPages: Math.ceil(effective.length / limit),
    },
    studySets: effective.slice(start, start + limit),
  };
};
