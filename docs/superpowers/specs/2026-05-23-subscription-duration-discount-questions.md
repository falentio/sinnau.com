# Subscription Duration Discount Questions

This document captures follow-up questions for the new multi-duration purchase requirement:

- Quarterly purchase: 3 months, discounted by `8/9`.
- Semi-annual purchase: 6 months, discounted by `12/18`.

Source context:

- `docs/superpowers/specs/2026-05-23-subscription-service-questions.md`
- `docs/superpowers/specs/2026-05-23-subscription-service-follow-up-questions.md`
- `src/lib/services/rate-limiter/constants.ts`
- `src/lib/services/midtrans/`

Relevant prior direction:

- First version is one-time monthly access, not recurring billing.
- Paid access uses historical subscription periods.
- Same-plan purchases can renew anytime.
- There is no prepaid extension cap.
- Orders snapshot `planKey`, billing amount, and duration, without storing currency because currency is always IDR.
- Local pending orders expire after 1 hour and Snap expiration should also be 1 hour.
- Current-plan lookup chooses the highest active paid tier.
- `FREE` is implicit and not represented as a paid subscription order.

---

### 1. What purchase durations should be supported?

#### Why ask this question

The new requirement introduces quarterly and semi-annual purchases, but implementation needs a typed set of allowed duration options. This affects schemas, validation, UI options, order snapshots, tests, and billing calculations.

#### Common approaches to resolve

**Approach A: Support monthly, quarterly, and semi-annual durations**

- Duration keys can be `MONTHLY`, `QUARTERLY`, and `SEMI_ANNUAL`.
- Matches the current one-month model plus the two new requirements.
- Keeps yearly and custom durations out of scope.

**Approach B: Support arbitrary month counts**

- User or caller passes `durationMonths`.
- Flexible, but more validation and pricing complexity.

**Approach C: Support only discounted durations for paid plans**

- Monthly remains implicit or legacy-only.
- Confusing because current design already assumes one-month purchases.

#### Recommended approach with explanation

Choose **Approach A**. Define explicit duration keys for `MONTHLY`, `QUARTERLY`, and `SEMI_ANNUAL`. This is type-safe, matches the requirement, and avoids arbitrary duration/pricing behavior.

#### Answer

Approach A

---

### 2. What exact access length should each duration grant?

#### Why ask this question

Previous answers define one month as a fixed 30-day period from local processing time. The new 3-month and 6-month options need exact day counts to avoid ambiguity around calendar months.

#### Common approaches to resolve

**Approach A: Multiply fixed 30-day months**

- Monthly = 30 days.
- Quarterly = 90 days.
- Semi-annual = 180 days.
- Consistent with the previous fixed 30-day answer.

**Approach B: Use calendar months**

- Quarterly adds 3 calendar months.
- Semi-annual adds 6 calendar months.
- More intuitive to some users, but more edge cases around month lengths.

**Approach C: Store duration as months but calculate end date with a date library later**

- Delays the decision.
- Creates ambiguity in tests and billing expectations.

#### Recommended approach with explanation

Choose **Approach A**. Treat subscription months as fixed 30-day units for the first version: 30, 90, and 180 days. This preserves the earlier fixed-period design.

#### Answer

Approach A

---

### 3. How should the quarterly discount `8/9` be interpreted?

#### Why ask this question

The phrase `discounted 8/9` could mean the customer pays `8/9` of the normal 3-month total, or receives an `8/9` discount. These are very different amounts.

#### Common approaches to resolve

**Approach A: Pay `8/9` of the normal 3-month price**

- For a 3-month purchase, amount = monthly price × 3 × `8/9`.
- Equivalent to paying for 2.666... months.
- Moderate discount.

**Approach B: Discount by `8/9` of the normal price**

- Customer pays only `1/9` of the normal 3-month price.
- Extremely large discount and likely not intended.

**Approach C: Treat `8/9` as "pay 8 months for 9 months" even though the duration is 3 months**

- Common ratio style for longer plans, but mismatched to quarterly duration.

#### Recommended approach with explanation

Choose **Approach A**. Interpret `8/9` as the multiplier applied to the normal 3-month total. The wording should be documented as "quarterly costs 8/9 of three monthly purchases."

#### Answer

Approach A, store discount as constant along with plan constant

---

### 4. How should the semi-annual discount `12/18` be interpreted?

#### Why ask this question

`12/18` simplifies to `2/3`. The requirement says semi-annually is 6 months, so the ratio could mean the customer pays `12/18` of the 6-month total, or it may imply a different "pay 12 for 18" pattern.

#### Common approaches to resolve

**Approach A: Pay `12/18` of the normal 6-month price**

- For a 6-month purchase, amount = monthly price × 6 × `12/18`.
- Equivalent to paying for 4 months and receiving 6 months.

**Approach B: Discount by `12/18` of the normal price**

- Customer pays only `6/18` of the normal 6-month price.
- Very large discount and likely not intended.

**Approach C: Rename the ratio as "pay 4 months for 6 months"**

- Equivalent to Approach A, but easier for implementation and UI copy.

#### Recommended approach with explanation

Choose **Approach C**. Implement the multiplier as `12/18`, but document/display it as "pay 4 months for 6 months" to avoid confusion.

#### Answer

Approach A


---

### 5. How should discounted amounts be rounded to IDR integers?

#### Why ask this question

Midtrans requires integer `gross_amount`. Quarterly pricing can produce fractions if monthly plan prices are not divisible cleanly by the discount denominator.

#### Common approaches to resolve

**Approach A: Round to nearest integer**

- Typical numeric rounding.
- Can round up or down depending on fraction.

**Approach B: Floor the amount**

- Never overcharges by a fraction.
- Can undercharge slightly.

**Approach C: Require prices and multipliers to produce integer amounts**

- Deterministic and avoids rounding.
- Constrains future plan prices.

#### Recommended approach with explanation

Choose **Approach C** for hardcoded first-version plans if current prices produce integers. Add a validation test that every plan/duration billing amount is a positive safe integer. If future prices break this, explicitly choose a rounding policy then.

#### Answer

Approach B


---

### 6. Should discount calculation use display prices or billing amounts?

#### Why ask this question

Prior answers say plan prices are interpreted as thousands of IDR for display, while payment needs integer IDR amounts. Discount calculations must use the correct source to avoid undercharging.

#### Common approaches to resolve

**Approach A: Use display price constants and multiply by 1,000 at the end**

- Works if display constants are always thousands of IDR.
- Risky if display format changes.

**Approach B: Use explicit billing amount constants in IDR**

- Safer for payment calculations.
- UI can still format or shorten values separately.

**Approach C: Use Midtrans amount from UI input**

- Flexible.
- Unsafe because client-provided pricing can be tampered with.

#### Recommended approach with explanation

Choose **Approach B**. Payment calculation should use server-owned IDR billing constants. The UI can display shortened prices, but checkout must never trust client-provided amounts.

#### Answer

Approach B

---

### 7. Should duration discounts apply to every paid plan?

#### Why ask this question

The requirement does not say whether quarterly and semi-annual discounts apply to both `PRO` and `PREMIUM`, or only selected plans.

#### Common approaches to resolve

**Approach A: Apply duration discounts to all paid plans**

- `PRO` and `PREMIUM` both support monthly, quarterly, and semi-annual purchases.
- Simple and consistent.

**Approach B: Apply discounts only to selected plans**

- Allows product-specific pricing strategy.
- Requires per-plan duration availability config.

**Approach C: Allow duration options for `FREE` too**

- Not meaningful because `FREE` is implicit and not billed.

#### Recommended approach with explanation

Choose **Approach A**. Apply the same duration options and discount multipliers to every paid plan. Keep `FREE` out of checkout.

#### Answer

Approach A


---

### 8. Should the order snapshot store `durationKey`, `durationMonths`, or `durationDays`?

#### Why ask this question

The order must snapshot purchase terms. Multi-duration pricing adds more fields, and the schema should support validation, fulfillment, and UI display without ambiguity.

#### Common approaches to resolve

**Approach A: Store only `durationDays`**

- Enough to fulfill access.
- Loses the original purchase option label.

**Approach B: Store `durationKey` and `durationDays`**

- Preserves the selected option and exact fulfillment length.
- Good for support, UI, and tests.

**Approach C: Store `durationKey`, `durationMonths`, `durationDays`, discount numerator, and discount denominator**

- Full snapshot of pricing rules.
- More fields than first version likely needs.

#### Recommended approach with explanation

Choose **Approach B**. Store `durationKey` and `durationDays` on the order. Store the final calculated amount as the billing snapshot. Add numerator/denominator only if detailed invoice math is needed later.

#### Answer

Approach B

---

### 9. Should `subscription_period` store duration metadata?

#### Why ask this question

Periods represent granted access, while orders represent purchase terms. It may be tempting to duplicate duration fields on the period for reporting or support.

#### Common approaches to resolve

**Approach A: Store duration metadata only on order**

- Period stores `startsAt` and `endsAt` only.
- Avoids duplication.

**Approach B: Copy `durationKey` and `durationDays` onto period**

- Easier period-only reporting.
- Can drift from order snapshot if not careful.

**Approach C: Store computed duration from `endsAt - startsAt` only**

- No extra fields.
- Harder to know selected package when extension bases vary.

#### Recommended approach with explanation

Choose **Approach A**. Keep purchase metadata on `subscription_order`; the period should store access boundaries and link to the order.

#### Answer

Approach B + Aproach B

---

### 10. How should same-plan renewal with quarterly/semi-annual duration extend access?

#### Why ask this question

Prior answers allow same-plan renewal anytime with no prepaid cap. Multi-duration orders need a precise extension base.

#### Common approaches to resolve

**Approach A: Extend from the latest same-plan active/future period end**

- If the user has active `PRO` until June 1 and buys quarterly `PRO`, new end is around August 30.
- Preserves prepaid time.

**Approach B: Extend from current local processing time**

- Simpler.
- Can waste existing paid time.

**Approach C: Create overlapping period and let highest/current lookup handle it**

- Works technically.
- Makes same-plan periods harder to reason about.

#### Recommended approach with explanation

Choose **Approach A**. Same-plan renewal should extend from the later of local processing time or the latest same-plan active/future `endsAt`.

#### Answer

Approach A


---

### 11. How should higher-plan upgrades with quarterly/semi-annual duration work?

#### Why ask this question

Prior answers say higher-plan purchases activate immediately and previous lower-plan periods remain unchanged. Multi-duration purchases need to confirm the new higher-plan period length.

#### Common approaches to resolve

**Approach A: Higher-plan duration starts immediately for selected duration**

- A quarterly `PREMIUM` upgrade creates 90 days of `PREMIUM` from processing time.
- Simple and matches immediate upgrade.

**Approach B: Add selected duration after lower-plan expiry**

- Avoids overlap.
- Does not give immediate upgrade.

**Approach C: Convert lower-plan remaining value into higher-plan extra duration**

- Economically precise.
- Requires proration, which was previously avoided.

#### Recommended approach with explanation

Choose **Approach A**. Higher-plan upgrades should create a new higher-plan period starting at local processing time for the selected duration days.

#### Answer

Approach A

---

### 12. Should lower-plan purchase rejection consider duration?

#### Why ask this question

Prior answers reject lower-plan purchases while a higher plan is active. With longer durations, users might try to buy a lower-plan semi-annual package for after premium expires.

#### Common approaches to resolve

**Approach A: Reject any lower-plan checkout while higher plan is active, regardless of duration**

- Keeps first version simple.
- No scheduled downgrades.

**Approach B: Allow lower-plan long-duration purchase as future scheduled access**

- Supports advance downgrade/renewal.
- Requires scheduled periods and clearer UI.

**Approach C: Allow lower-plan purchase but activate only after admin reconciliation**

- Avoids automated scheduling.
- Confusing and operationally noisy.

#### Recommended approach with explanation

Choose **Approach A**. Duration should not bypass the existing lower-plan rejection rule.

#### Answer

Approach A

---

### 13. Should discounted duration purchases be available when the user has pending orders?

#### Why ask this question

Prior answers allow multiple pending orders and rely on frontend click prevention. Multi-duration options increase the chance that a user creates different pending orders for the same plan and different duration.

#### Common approaches to resolve

**Approach A: Allow multiple pending orders across duration options**

- Matches prior pending-order decision.
- User can accidentally create multiple payable links.

**Approach B: Block new pending order for same plan, regardless of duration**

- Reduces duplicate invoices.
- More backend enforcement than previously chosen.

**Approach C: Block only exact same plan and duration while pending**

- Prevents exact duplicates.
- Still allows multiple pending links for different durations.

#### Recommended approach with explanation

Choose **Approach A** if preserving prior scope is more important. Choose **Approach C** if duplicate exact links become a concern without changing broader behavior.

#### Answer

Approach A

---

### 14. How should checkout UI display duration discounts?

#### Why ask this question

The discount ratios `8/9` and `12/18` are precise but not user-friendly. UI copy should avoid ambiguity and align with actual billing.

#### Common approaches to resolve

**Approach A: Show raw ratio**

- Example: "Quarterly discount 8/9".
- Confusing for users.

**Approach B: Show final amount and monthly equivalent**

- Example: "Quarterly: Rp80.000 for 3 months" and "Rp26.667/month equivalent".
- Clearer but requires formatting rounded monthly equivalent.

**Approach C: Show "pay X months, get Y months" copy**

- Semi-annual can be "pay 4 months, get 6 months".
- Quarterly with `8/9` becomes less clean.

#### Recommended approach with explanation

Choose **Approach B**. Display the final charged amount and duration. Monthly equivalent can be shown as secondary copy if formatting is acceptable.

#### Answer

Approach A as (-11%)
but we dont need to work with the ui yet.


---

### 15. Should UI show percentage discount?

#### Why ask this question

Marketing may want to show savings, but ratios like `8/9` and `12/18` produce repeating or simplified percentages.

#### Common approaches to resolve

**Approach A: Do not show percentages**

- Avoids rounding and copy disputes.
- Shows only final amount.

**Approach B: Show rounded percentage savings**

- Quarterly `8/9` is about 11.11% savings.
- Semi-annual `12/18` is about 33.33% savings.
- Requires rounding rules.

**Approach C: Show "save RpX" compared to monthly purchases**

- Concrete and currency-based.
- Requires amount comparison in UI.

#### Recommended approach with explanation

Choose **Approach C**. "Save RpX" is less ambiguous than displaying fractional percentages.

#### Answer

Approach B, but we dont need to touch the UI yet


---

### 16. Should API input accept `durationKey` or month count?

#### Why ask this question

Checkout creation needs to know which package the user selected. The command input shape affects validation and future extensibility.

#### Common approaches to resolve

**Approach A: Accept `durationKey`**

- Example: `{ planKey: 'PRO', durationKey: 'QUARTERLY' }`.
- Type-safe and matches hardcoded pricing.

**Approach B: Accept `durationMonths`**

- Example: `{ planKey: 'PRO', durationMonths: 3 }`.
- More generic, but callers can pass unsupported values.

**Approach C: Accept provider price ID**

- Common for some payment providers.
- Not needed with server-owned hardcoded pricing.

#### Recommended approach with explanation

Choose **Approach A**. The server should validate `durationKey` against a hardcoded duration catalog.

#### Answer

Approach A



---

### 17. Should duration options be exported from Rate Limiter constants or Subscription constants?

#### Why ask this question

Plan keys currently live in Rate Limiter constants, but duration pricing belongs to Subscription. Placing duration constants in the wrong domain can blur service boundaries.

#### Common approaches to resolve

**Approach A: Add duration options to Rate Limiter constants**

- Keeps plan-related constants together.
- Rate Limiter does not own billing duration.

**Approach B: Define duration options in Subscription constants**

- Keeps billing terms inside Subscription.
- Subscription imports plan keys from Rate Limiter or a future shared plan catalog.

**Approach C: Create a shared plan catalog service/module now**

- Clean long-term boundary.
- Larger refactor for first version.

#### Recommended approach with explanation

Choose **Approach B** for first implementation. Duration and discount constants belong to Subscription. Avoid moving plan keys unless a shared catalog becomes necessary.

#### Answer

Approach A

---

### 18. Should order amount validation include duration discount details?

#### Why ask this question

Provider gross amount must match the local order amount. With duration discounts, tests should verify that the charged amount matches plan, duration, and discount rules.

#### Common approaches to resolve

**Approach A: Validate only final amount**

- Simple.
- Assumes order snapshot was calculated correctly.

**Approach B: Validate final amount and test calculation per plan/duration**

- Runtime validation stays simple.
- Unit tests prove the pricing table.

**Approach C: Recalculate amount from current constants during settlement**

- Detects mismatched snapshot.
- Can conflict with prior order-snapshot direction.

#### Recommended approach with explanation

Choose **Approach B**. Settlement should compare provider amount to the order snapshot amount. Separate unit tests should prove all plan/duration amounts are calculated correctly.

#### Answer

Approach B


---

### 19. Should referral rewards vary by purchase duration?

#### Why ask this question

Prior answers award referral points for every successful paid order. Longer purchases produce more revenue and may deserve different rewards.

#### Common approaches to resolve

**Approach A: Same referral points for every successful order**

- Simple and matches existing referral semantics.
- Under-rewards longer purchases compared to monthly purchases.

**Approach B: Referral points scale by duration months**

- Quarterly gives 3x monthly points; semi-annual gives 6x.
- More aligned with access duration.

**Approach C: Referral points scale by charged amount**

- Economically aligned with discounted revenue.
- Requires amount-to-points policy.

#### Recommended approach with explanation

Choose **Approach A** unless referral reward economics are explicitly part of this change. Keep duration-discount billing separate from referral policy for the first pass.

#### Answer

Referral Point are 30% of charged amount, maximum 25k

---

### 20. Should admin manual grants support duration packages or raw day counts?

#### Why ask this question

Prior answers allow admin grant/revoke commands. Multi-duration support creates a choice between package-based grants and arbitrary support grants.

#### Common approaches to resolve

**Approach A: Admin grants use the same duration keys as checkout**

- Consistent and easy to validate.
- Less flexible for support exceptions.

**Approach B: Admin grants accept raw day count with reason**

- Flexible support tool.
- More validation needed to avoid accidental huge grants.

**Approach C: No admin grants for discounted duration scope**

- Keeps discount implementation focused.
- Leaves manual grant design for later.

#### Recommended approach with explanation

Choose **Approach A** for consistency if admin grant is implemented in the same milestone. Add raw day grants only if support workflows need arbitrary access corrections.

#### Answer

Approach A



---

### 21. Should cleanup logic treat longer periods differently?

#### Why ask this question

Semi-annual periods last 180 days, so cleanup must not assume all paid periods are 30 days. Expiry should be based on actual `endsAt`, not duration type.

#### Common approaches to resolve

**Approach A: Cleanup uses `endsAt <= now` only**

- Works for all durations.
- Simple and correct.

**Approach B: Cleanup uses duration-specific age thresholds**

- More complicated.
- Easy to get wrong.

**Approach C: Cleanup ignores periods and only current-plan lookup handles expiry**

- Correct lookup can still work.
- Leaves stale active statuses.

#### Recommended approach with explanation

Choose **Approach A**. Cleanup should use stored period boundaries, not assumptions about monthly duration.

#### Answer

Approach A

---

### 22. Should tests cover exact discounted amounts for every paid plan and duration?

#### Why ask this question

Billing bugs are high impact. The discount ratios should be locked down in tests so future plan price changes do not silently create invalid Midtrans amounts.

#### Common approaches to resolve

**Approach A: Test only one plan/duration example**

- Quick.
- Misses matrix bugs.

**Approach B: Test all paid plan and duration combinations**

- Strong coverage for billing calculations.
- Small matrix with current plans.

**Approach C: Rely on TypeScript type checks**

- Not enough for arithmetic correctness.

#### Recommended approach with explanation

Choose **Approach B**. Add table-driven tests for `PRO` and `PREMIUM` across monthly, quarterly, and semi-annual durations.

#### Answer

Approach B

---

## Recommended Next Step

Answer these duration-discount questions before writing the final Subscription service spec. The most important decisions are duration keys, day counts, exact discount interpretation, amount calculation/rounding, order snapshot fields, and renewal/upgrade behavior for longer purchases.
