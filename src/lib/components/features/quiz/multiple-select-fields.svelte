<script lang="ts">
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import type { CreateQuizInput } from "$lib/schemas/quiz";
  import { MS_OPTION_COUNT_HINT } from "$lib/schemas/quiz";
  import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { CreateQuizForm, CreateQuizFormData } from "./create-quiz-form";

  let {
    form,
    formData,
    disabled = false,
    showExplanation = false,
  }: {
    form: CreateQuizForm;
    formData: CreateQuizFormData;
    disabled?: boolean;
    showExplanation?: boolean;
  } = $props();

  const addOption = () => {
    if ($formData.options.length >= MS_OPTION_COUNT_HINT.max) {
      return;
    }
    $formData.options = [
      ...$formData.options,
      { explanation: "", isCorrect: false, optionText: "" },
    ];
  };

  const removeOption = (index: number) => {
    if ($formData.options.length <= MS_OPTION_COUNT_HINT.min) {
      return;
    }
    $formData.options = (
      $formData.options as CreateQuizInput["options"]
    ).filter((_, i) => i !== index);
  };

  const toggleCorrect = (index: number) => {
    $formData.options = ($formData.options as CreateQuizInput["options"]).map(
      (opt, i) => (i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt)
    );
  };
</script>

<Form.Fieldset {form} name="options">
  <Form.Legend>Pilihan Jawaban</Form.Legend>

  {#each $formData.options as _, i (i)}
    <div class="flex items-start gap-3 rounded-2xl border bg-background/50 p-3">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
      >
        {String.fromCharCode(65 + i)}
      </div>

      <div class="min-w-0 flex-1 space-y-2">
        <Form.ElementField {form} name={`options[${i}].optionText`}>
          <Form.Control>
            {#snippet children({ props })}
              <Input
                {...props}
                bind:value={$formData.options[i]!.optionText}
                placeholder="Opsi {String.fromCharCode(65 + i)}"
                maxlength={500}
                {disabled}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.ElementField>

        <button
          type="button"
          onclick={() => toggleCorrect(i)}
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors {$formData
            .options[i]?.isCorrect
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-input text-muted-foreground hover:bg-accent'}"
          {disabled}
        >
          {#if $formData.options[i]?.isCorrect}
            <HugeiconsIcon icon={Tick02Icon} size={14} class="shrink-0" />
            Jawaban Benar
          {:else}
            <HugeiconsIcon icon={Cancel01Icon} size={14} class="shrink-0" />
            Jawaban Salah
          {/if}
        </button>

        {#if showExplanation}
          <Form.ElementField {form} name={`options[${i}].explanation`}>
            <Form.Control>
              {#snippet children({ props })}
                <Input
                  {...props}
                  bind:value={$formData.options[i]!.explanation}
                  placeholder="Penjelasan (opsional)"
                  {disabled}
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.ElementField>
        {/if}
      </div>

      <button
        type="button"
        onclick={() => removeOption(i)}
        class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled ||
          $formData.options.length <= MS_OPTION_COUNT_HINT.min}
        aria-label="Hapus opsi {String.fromCharCode(65 + i)}"
      >
        ✕
      </button>
    </div>
  {/each}

  <Form.FieldErrors />
</Form.Fieldset>

{#if $formData.options.length < MS_OPTION_COUNT_HINT.max}
  <button
    type="button"
    onclick={addOption}
    class="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
    {disabled}
  >
    + Tambah Opsi ({$formData.options.length}/{MS_OPTION_COUNT_HINT.max})
  </button>
{/if}
