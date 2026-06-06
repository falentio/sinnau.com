import { STUDY_SET_PAGE_LIMIT } from "$lib/schemas/study-set.constant";
import { beforeEach, describe, it, vi } from "vitest";

import type * as StudySetUtils from "./study-set.utils.ts";

describe("getStudySetStubs", () => {
  let getStudySetStubs: typeof StudySetUtils.getStudySetStubs;

  beforeEach(async () => {
    vi.resetModules();
    ({ getStudySetStubs } = await import("./study-set.utils.ts"));
  });

  it("returns the requested count of study sets", ({ expect }) => {
    const result = getStudySetStubs(5, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.total).toBe(5);
    expect(result.studySets).toHaveLength(5);
  });

  it("returns totalPages of 1 when count is less than limit", ({ expect }) => {
    const result = getStudySetStubs(9, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.totalPages).toBe(1);
    expect(result.studySets).toHaveLength(9);
  });

  it("returns totalPages greater than 1 when count exceeds limit", ({
    expect,
  }) => {
    const result = getStudySetStubs(25, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.studySets).toHaveLength(10);
  });

  it("paginates correctly on page 2", ({ expect }) => {
    const result = getStudySetStubs(25, 2, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.total).toBe(25);
    expect(result.studySets).toHaveLength(10);
  });

  it("last page returns fewer items when total is not evenly divisible", ({
    expect,
  }) => {
    const result = getStudySetStubs(25, 3, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.totalPages).toBe(3);
    expect(result.studySets).toHaveLength(5);
  });

  it("assigns the given ownerId and shapes fields correctly", ({ expect }) => {
    const result = getStudySetStubs(3, 1, STUDY_SET_PAGE_LIMIT, "owner-stub");

    for (const set of result.studySets) {
      expect(set.ownerId).toBe("owner-stub");
      expect(set.id).toMatch(/^sts_stub\d{2}$/u);
      expect(set.slug).toMatch(/^stub-study-set-\d+$/u);
      expect(set.title).toMatch(/^Modul Pembelajaran \d+$/u);
      expect(set.createdAt).toBeInstanceOf(Date);
      expect(set.updatedAt).toBeInstanceOf(Date);
      expect(set.files).toEqual([]);
    }
  });

  it("makes every 5th item PRIVATE, rest PUBLIC (0-indexed)", ({ expect }) => {
    const result = getStudySetStubs(10, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    for (const [i, set] of result.studySets.entries()) {
      expect(set.visibility).toBe(i % 5 === 0 ? "PRIVATE" : "PUBLIC");
    }
  });

  it("makes every 3rd item have a description", ({ expect }) => {
    const result = getStudySetStubs(6, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    for (const [i, set] of result.studySets.entries()) {
      if (i % 3 === 0) {
        expect(set.description).toBe(`Deskripsi modul belajar nomor ${i + 1}`);
      } else {
        expect(set.description).toBeNull();
      }
    }
  });

  it("respects a smaller count when cache was populated by a larger call", ({
    expect,
  }) => {
    getStudySetStubs(100, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    const result = getStudySetStubs(3, 1, STUDY_SET_PAGE_LIMIT, "owner-1");

    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.studySets).toHaveLength(3);
  });
});
