import { describe, expect, it } from "vitest";

import {
  answerStateForPill,
  formatSessionTimestamp,
  scoreToCopy,
  sessionStatusLabel,
} from "./quiz-session.ts";

describe.concurrent(scoreToCopy, () => {
  it.each([
    [100, "Sempurna"],
    [99, "Bagus sekali"],
    [90, "Bagus sekali"],
    [89, "Hebat"],
    [75, "Hebat"],
    [74, "Coba lagi"],
    [50, "Coba lagi"],
    [0, "Coba lagi"],
  ])("score %i → %s", (score, expected) => {
    expect(scoreToCopy(score)).toBe(expected);
  });
});

describe.concurrent(sessionStatusLabel, () => {
  it.each([
    ["ACTIVE", "Aktif"],
    ["COMPLETED", "Selesai"],
  ] as const)("%s → %s", (status, expected) => {
    expect(sessionStatusLabel(status)).toBe(expected);
  });
});

describe.concurrent(answerStateForPill, () => {
  const nil = null;
  const empty: string[] = [];
  const filled: string[] = ["opt_000000000000000001"];

  it("current + any answer is 'current'", () => {
    expect(answerStateForPill(nil, true, false)).toBe("current");
    expect(answerStateForPill(empty, true, false)).toBe("current");
    expect(answerStateForPill(filled, true, false)).toBe("current");
    expect(answerStateForPill(nil, true, true)).toBe("current");
  });

  it("not current + no answer + not visited is 'unvisited'", () => {
    expect(answerStateForPill(nil, false, false)).toBe("unvisited");
    expect(answerStateForPill(empty, false, false)).toBe("unvisited");
  });

  it("not current + no answer + visited is 'visited-unanswered'", () => {
    expect(answerStateForPill(nil, false, true)).toBe("visited-unanswered");
    expect(answerStateForPill(empty, false, true)).toBe("visited-unanswered");
  });

  it("not current + answer is 'answered' regardless of visited", () => {
    expect(answerStateForPill(filled, false, false)).toBe("answered");
    expect(answerStateForPill(filled, false, true)).toBe("answered");
  });
});

describe.concurrent(formatSessionTimestamp, () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();

  it("under 1 minute → 'Baru saja'", () => {
    expect(formatSessionTimestamp(now - 30_000, now)).toBe("Baru saja");
  });

  it("1 hour → '1 jam lalu'", () => {
    expect(formatSessionTimestamp(now - 60 * 60_000, now)).toBe("1 jam lalu");
  });

  it("yesterday → 'Kemarin'", () => {
    expect(formatSessionTimestamp(now - 26 * 60 * 60_000, now)).toBe("Kemarin");
  });

  it("7 days ago → '8 Jun' (no year when current year)", () => {
    expect(formatSessionTimestamp(now - 7 * 24 * 60 * 60_000, now)).toBe(
      "8 Jun"
    );
  });

  it("last year → includes the year", () => {
    expect(
      formatSessionTimestamp(new Date("2025-12-01T00:00:00Z").getTime(), now)
    ).toBe("1 Des 2025");
  });
});
