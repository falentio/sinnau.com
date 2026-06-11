## Form componentization

### Extracting form setup into a helper

When a page form grows complex, extract the `superForm` call and submission logic into a helper function. The helper returns `superForm` itself (not destructured) so the page can destructure what it needs:

```ts
import { defaults, superForm } from "sveltekit-superforms";
import type { SomeSchema } from "$lib/schemas/some-domain";

export const createSomeForm = () => {
  const superFormResult = superForm(defaults<SomeSchema>(/* ... */), {
    SPA: true,
    dataType: "json" /* ... */,
  });
  return { form: superFormResult /* additional shared values */ };
};

// Export types for child components to use in $props():
export type SomeForm = ReturnType<typeof createSomeForm>;
export type SomeFormObject = SomeForm["form"];
export type SomeFormData = SomeFormObject["form"];
```

Child form-field components import these types for typed `$props()`:

```svelte
<script lang="ts">
  import type { SomeFormObject, SomeFormData } from "./create-some-form";
  let { form, formData }: { form: SomeFormObject; formData: SomeFormData } =
    $props();
</script>
```

### Binding to store values

**Never derive from the store for iteration or binding.** Use the store directly with index access so formsnap can track field paths:

```svelte
<!-- Wrong: derives a snapshot, breaks reactivity -->
{#each $formData.tags as tag, i}
  <input bind:value={tag.name} />
{/each}

<!-- Right: uses store with index -->
{#each $formData.tags as _, i}
  <input bind:value={$formData.tags[i].name} />
{/each}
```

### Dynamic array fields with ElementField

Formsnap requires `FormPath` for the `Field` component and `FormPathLeaves` for `ElementField`. The TypeScript types don't accept indexed paths at runtime, so use `as any` on the `name` prop when working with array indices:

```svelte
<Form.Fieldset {form} name="items">
  {#each $formData.items as _, i}
    <Form.ElementField {form} name={`items[${i}].text`}>
      <Form.Control>
        {#snippet children({ props })}
          <input {...props} bind:value={$formData.items[i].text} />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.ElementField>
  {/each}
  <Form.FieldErrors />
</Form.Fieldset>
```

Rules:

- Use `Fieldset` (with `name`) as the outermost wrapper for array-level context and array-level errors.
- Use `ElementField` for each leaf property within the array element — one per input field. Use the full dotted path (`items[${i}].text`).
- Each `ElementField` gets its own `Control` + `FieldErrors`.
- A top-level `<Form.FieldErrors />` inside the `Fieldset` (outside the `{#each}`) shows array-level validation errors.
- Do NOT nest a child component's fields in a parent `ElementField` unless that parent corresponds to an actual leaf path in the schema. The per-field `ElementField` is sufficient.
