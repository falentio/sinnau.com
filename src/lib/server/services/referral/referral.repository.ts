import type {
  InsertReferralProfile,
  InsertReferralRelationship,
  InsertReferralSubscriptionEvent,
  ReferralProfile,
  ReferralRelationship,
  ReferralSubscriptionEvent,
} from "../../infras/db/schema/referral.ts";

export interface ReferralRepository {
  insertProfile(
    row: Omit<InsertReferralProfile, "createdAt" | "updatedAt">
  ): Promise<ReferralProfile>;
  findProfileByUserId(userId: string): Promise<ReferralProfile | null>;
  findProfileBySlug(slug: string): Promise<ReferralProfile | null>;
  updateProfilePoints(
    id: string,
    newPoints: number,
    expectedVersion: number
  ): Promise<ReferralProfile | null>;
  isSlugTaken(candidate: string): Promise<boolean>;
  insertRelationship(
    row: Omit<InsertReferralRelationship, "createdAt">
  ): Promise<ReferralRelationship>;
  findRelationshipByReferredUserId(
    referredUserId: string
  ): Promise<ReferralRelationship | null>;
  insertSubscriptionEvent(
    row: Omit<InsertReferralSubscriptionEvent, "createdAt">
  ): Promise<ReferralSubscriptionEvent>;
  findSubscriptionEventByIdempotencyKey(
    idempotencyKey: string
  ): Promise<ReferralSubscriptionEvent | null>;
}
