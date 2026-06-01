# Flashcard Rating Buttons Design

## Goal

Improve the flashcard session rating controls so learners can quickly choose how well they understood a card and see when the card will repeat.

## Context

The current flashcard session page has four vertically stacked outline buttons under the card:

- Lupa
- Sulit
- Cukup
- Mudah

This works functionally, but it takes more vertical space than needed and does not explain the scheduling effect of each choice.

## Approved Direction

Use a compact four-column scale row inside the existing rating card. Each option shows:

- an emotion icon
- the rating label
- a small repeat interval with a time icon

The row should preserve the existing visual language: rounded corners, card background, subtle shadow, and color-coded choices.

## Rating Options

The default review schedule is:

| Rating | Interval |
| ------ | -------- |
| Lupa   | 1 jam    |
| Sulit  | 6 jam    |
| Cukup  | 1 hari   |
| Mudah  | 3 hari   |

Each interval should be displayed directly in its button, using an hour/time icon followed by the interval text.

## UI Behavior

The rating panel remains below the flashcard. The four choices should be visible at the same time on mobile and desktop.

The intended layout is:

- card container title: `Seberapa paham kamu?`
- optional small helper text or right-aligned label: `Jadwal ulang`
- four equal-width rating buttons in one row
- each button stacks icon, label, and interval vertically

## Accessibility

Buttons must remain actual button elements through the existing `Button` component or equivalent accessible markup. The visible interval text should be part of the accessible label so keyboard and screen-reader users understand the consequence of each choice.

## Scope

This design covers only the visual and static UI improvement for the existing TODO in `src/routes/session/[studySetId]/flashcard/+page.svelte`.

Out of scope for this pass:

- saving ratings
- implementing spaced-repetition logic
- navigating to the next card
- loading real session data

## Testing

Verify that the Svelte page compiles and that the layout remains readable at narrow mobile widths. The final implementation should run the project checks available for this repository.
