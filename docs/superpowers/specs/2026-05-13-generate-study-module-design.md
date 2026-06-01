# Generate Study Module with AI - Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Overview

Create a page at `src/routes/(app)/study/generate/+page.svelte` for generating study modules using AI. The page provides a form for users to upload documents (PDF/DOCX) and optionally provide additional instructions for the AI.

## Layout & Structure

- Max-width 2xl container, centered
- Consistent padding (px-6, py-6)
- Back button linking to `/home` using `ArrowLeft01Icon`
- Page title: "Buat Modul dengan AI"

## Form Schema (Valibot)

```typescript
const formSchema = v.object({
  files: v.array(v.instanceof(File), // or appropriate type for file validation
  instructions: v.pipe(v.string(), v.maxLength(1000))
});
```

## Form Fields

### 1. Files Field (`name="files"`)

**Two file inputs side by side:**
- PDF input: accepts `.pdf` files only
- DOCX input: accepts `.docx` files only
- Button style: outline variant with upload icon
- Each button shows placeholder text: "Pilih file PDF" / "Pilih file DOCX"
- After selection, display selected filename

**Implementation approach:** Use native `<input type="file">` with `accept` attribute, styled as shadcn Button. This is simpler than building a custom file input component.

### 2. Advanced Mode Toggle

**Toggle button that shows/hides additional options:**
- Label: "Mode Lanjutan"
- Icon: `ArrowDown01Icon` when collapsed, `ArrowUp01Icon` when expanded
- Collapsed by default
- Uses Svelte 5 `$state` for toggle tracking

### 3. Additional Instructions Field (`name="instructions"`)

**Only visible when advanced mode is enabled:**
- Textarea input
- Character counter showing current/max (0/1000)
- Placeholder: "Tambahkan instruksi khusus untuk AI..."

## Component Inventory

| Component | Type | Notes |
|-----------|------|-------|
| Button | shadcn | File upload buttons, submit, cancel |
| Form.Field | shadcn/formsnap | Wrapper for form fields |
| Form.Label | shadcn/formsnap | Field labels |
| Form.Description | shadcn/formsnap | Helper text |
| Form.FieldErrors | shadcn/formsnap | Validation errors |
| Input | shadcn | File inputs (type="file") |
| Textarea | shadcn | Additional instructions |
| HugeiconsIcon | @hugeicons/svelte | Icons throughout |

## States

### Submitting State
- All form controls disabled
- Submit button shows "Membuat..." with loading indicator
- Cancel button also disabled

### Error States
- Field-level validation errors shown via `Form.FieldErrors`
- Server error banner at top of form (if applicable)

## Form Actions

- **Submit button:** "Hasilkan Modul" / "Membuat..."
- **Cancel button:** Returns to `/home`

## Accessibility

- Use proper label associations via formsnap
- File inputs have appropriate `accept` attributes
- Toggle button has accessible labeling
- Focus management on form fields

## Implementation Notes

- Use `superForm` from `sveltekit-superforms` with Valibot adapter
- SPA mode (`SPA: true`) since no server action needed yet
- Follow existing patterns from `src/routes/(app)/study/new/+page.svelte`
- Svelte 5 runes syntax (`$state`, `$derived`, `$props`)