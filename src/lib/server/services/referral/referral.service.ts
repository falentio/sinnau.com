import { REFERRAL_ID_PREFIX } from "$lib/schemas/referral";
import { ORPCError } from "@orpc/server";

import type {
  ReferralProfile,
  ReferralRelationship,
} from "../../infras/db/schema/referral.ts";
import { generateSlug, SlugConflictError } from "../../infras/slug.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { ReferralGuard } from "./referral.guard.ts";
import type { ReferralRepository } from "./referral.repository.ts";

export type { ReferralProfile, ReferralRelationship };

export class ReferralService {
  private readonly repo: ReferralRepository;
  private readonly guard: ReferralGuard;

  constructor(repo: ReferralRepository, guard: ReferralGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async getOrCreateReferralProfile(
    _input: Record<string, never>,
    userId: string | null | undefined,
    userName: string
  ): Promise<ReferralProfile> {
    const user = this.guard.requireUser(userId);

    const existing = await this.repo.findProfileByUserId(user);
    if (existing) {
      return existing;
    }

    if (!userName || userName.trim().length === 0) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "User must have a name to create a referral profile",
      });
    }

    const slug = await generateSlug(
      userName,
      async (candidate) => await this.repo.isSlugTaken(candidate)
    ).catch((error: unknown) => {
      if (error instanceof SlugConflictError) {
        throw new ORPCError("REFERRAL_SLUG_GENERATION_FAILED", {
          message: error.message,
        });
      }
      throw error;
    });

    return await this.repo.insertProfile({
      id: generateId(REFERRAL_ID_PREFIX),
      points: 0,
      slug,
      userId: user,
      version: 1,
    });
  }

  async resolveReferralSlug(input: { slug: string }): Promise<ReferralProfile> {
    const profile = await this.repo.findProfileBySlug(input.slug);
    if (!profile) {
      throw new ORPCError("REFERRAL_SLUG_NOT_FOUND", {
        message: "Referral slug not found",
      });
    }
    return profile;
  }

  async recordReferralRelationship(input: {
    referrerUserId: string;
    referredUserId: string;
  }): Promise<ReferralRelationship> {
    if (input.referrerUserId === input.referredUserId) {
      throw new ORPCError("SELF_REFERRAL_NOT_ALLOWED", {
        message: "Cannot refer yourself",
      });
    }

    const existing = await this.repo.findRelationshipByReferredUserId(
      input.referredUserId
    );
    if (existing) {
      throw new ORPCError("REFERRAL_ALREADY_EXISTS", {
        message: "User already has a referral relationship",
      });
    }

    return await this.repo.insertRelationship({
      id: generateId(REFERRAL_ID_PREFIX),
      referredUserId: input.referredUserId,
      referrerUserId: input.referrerUserId,
    });
  }

  async addReferralPoints(input: {
    referrerUserId: string;
    referredUserId: string;
    points: number;
    idempotencyKey: string;
    expectedVersion: number;
  }): Promise<ReferralProfile> {
    const existingEvent = await this.repo.findSubscriptionEventByIdempotencyKey(
      input.idempotencyKey
    );
    if (existingEvent) {
      const profile = await this.repo.findProfileByUserId(input.referrerUserId);
      if (!profile) {
        throw new ORPCError("REFERRAL_PROFILE_NOT_FOUND", {
          message: "Referral profile not found",
        });
      }
      return profile;
    }

    const profile = await this.repo.findProfileByUserId(input.referrerUserId);
    if (!profile) {
      throw new ORPCError("REFERRAL_PROFILE_NOT_FOUND", {
        message: "Referral profile not found",
      });
    }

    const relationship = await this.repo.findRelationshipByReferredUserId(
      input.referredUserId
    );
    if (!relationship) {
      throw new ORPCError("REFERRAL_RELATIONSHIP_NOT_FOUND", {
        message: "Referral relationship not found",
      });
    }

    const newPoints = profile.points + input.points;

    const updated = await this.repo.updateProfilePoints(
      profile.id,
      newPoints,
      input.expectedVersion
    );
    if (!updated) {
      throw new ORPCError("REFERRAL_VERSION_CONFLICT", {
        message: "Profile version conflict",
      });
    }

    await this.repo.insertSubscriptionEvent({
      id: generateId(REFERRAL_ID_PREFIX),
      idempotencyKey: input.idempotencyKey,
      pointsAwarded: input.points,
      referredUserId: input.referredUserId,
      referrerUserId: input.referrerUserId,
      relationshipId: relationship.id,
    });

    return updated;
  }

  async adjustReferralPoints(input: {
    referrerUserId: string;
    points: number;
    reason: string;
    idempotencyKey: string;
    expectedVersion: number;
  }): Promise<ReferralProfile> {
    const existingEvent = await this.repo.findSubscriptionEventByIdempotencyKey(
      input.idempotencyKey
    );
    if (existingEvent) {
      const profile = await this.repo.findProfileByUserId(input.referrerUserId);
      if (!profile) {
        throw new ORPCError("REFERRAL_PROFILE_NOT_FOUND", {
          message: "Referral profile not found",
        });
      }
      return profile;
    }

    const profile = await this.repo.findProfileByUserId(input.referrerUserId);
    if (!profile) {
      throw new ORPCError("REFERRAL_PROFILE_NOT_FOUND", {
        message: "Referral profile not found",
      });
    }

    const newPoints = profile.points + input.points;
    if (newPoints < 0) {
      throw new ORPCError("REFERRAL_POINTS_CONFLICT", {
        message: "Point adjustment would produce a negative balance",
      });
    }

    const updated = await this.repo.updateProfilePoints(
      profile.id,
      newPoints,
      input.expectedVersion
    );
    if (!updated) {
      throw new ORPCError("REFERRAL_VERSION_CONFLICT", {
        message: "Profile version conflict",
      });
    }

    await this.repo.insertSubscriptionEvent({
      id: generateId(REFERRAL_ID_PREFIX),
      idempotencyKey: input.idempotencyKey,
      pointsAwarded: input.points,
      referredUserId: null,
      referrerUserId: input.referrerUserId,
      relationshipId: null,
    });

    return updated;
  }

  async getMyReferralProfile(input: {
    userId: string;
  }): Promise<ReferralProfile> {
    const profile = await this.repo.findProfileByUserId(input.userId);
    if (!profile) {
      throw new ORPCError("REFERRAL_PROFILE_NOT_FOUND", {
        message: "Referral profile not found",
      });
    }
    return profile;
  }
}
