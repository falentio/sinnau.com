<script lang="ts">
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";

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
</script>

<Form.Fieldset form={form as any} name="options">
  <Form.ElementField form={form as any} name={`options[0].optionText` as any}>
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Kunci Jawaban</Form.Label>
        <Input
          {...props}
          bind:value={$formData.options[0]!.optionText}
          placeholder="Ketik jawaban yang benar..."
          maxlength={500}
          {disabled}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.ElementField>

  {#if showExplanation}
    <Form.ElementField {form} name={`options[0].explanation`}>
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Penjelasan (opsional)</Form.Label>
          <Input
            {...props}
            bind:value={$formData.options[0]!.explanation}
            placeholder="Jelaskan kenapa jawaban ini benar..."
            {disabled}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.ElementField>
  {/if}

  <Form.FieldErrors />
</Form.Fieldset>
