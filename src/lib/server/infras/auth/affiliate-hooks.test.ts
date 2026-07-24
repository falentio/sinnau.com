import { beforeEach, describe, it, vi } from "vitest";

import { resolveAffiliateReferrer } from "./affiliate-hooks";

vi.mock(import("$lib/server/services/affiliate/index"), () => ({
  affiliateService: {
    hasProfile: vi.fn<() => Promise<boolean>>(),
  },
}));

const { affiliateService } =
  await import("$lib/server/services/affiliate/index");
// oxlint-disable-next-line typescript/unbound-method -- mocked method, no real `this`
const mockHasProfile = vi.mocked(affiliateService.hasProfile);

const ctxWith = (cookie?: string) => ({
  getCookie: (_name: string) => cookie,
});

describe.concurrent("affiliate referrer resolution", () => {
  beforeEach(() => {
    mockHasProfile.mockReset();
  });

  it("returns empty when ctx is null", async ({ expect }) => {
    const result = await resolveAffiliateReferrer(null);
    expect(result).toEqual({});
  });

  it("returns empty when cookie is absent", async ({ expect }) => {
    const result = await resolveAffiliateReferrer(ctxWith());
    expect(result).toEqual({});
  });

  it("returns empty on self-referral", async ({ expect }) => {
    const result = await resolveAffiliateReferrer(ctxWith("user-1"), "user-1");
    expect(result).toEqual({});
  });

  it("returns empty when referrer has no profile", async ({ expect }) => {
    mockHasProfile.mockResolvedValue(false);
    const result = await resolveAffiliateReferrer(ctxWith("referrer-1"));
    expect(result).toEqual({});
  });

  it("returns affiliatedBy when referrer has a profile", async ({ expect }) => {
    mockHasProfile.mockResolvedValue(true);
    const result = await resolveAffiliateReferrer(ctxWith("referrer-1"));
    expect(result).toEqual({ affiliatedBy: "referrer-1" });
  });

  it("returns empty when hasProfile throws (DB failure)", async ({
    expect,
  }) => {
    mockHasProfile.mockRejectedValue(new Error("DB connection lost"));
    const result = await resolveAffiliateReferrer(ctxWith("referrer-1"));
    expect(result).toEqual({});
  });
});
