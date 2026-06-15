<script lang="ts">
  import { page } from "$app/state";
  import {
    createQuizForm,
    getDefaultOptions,
  } from "$lib/components/features/quiz/create-quiz-form";
  import FillInTheBlankFields from "$lib/components/features/quiz/fill-in-the-blank-fields.svelte";
  import MultipleChoiceFields from "$lib/components/features/quiz/multiple-choice-fields.svelte";
  import MultipleSelectFields from "$lib/components/features/quiz/multiple-select-fields.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import type { Chapter } from "$lib/schemas/chapter";
  import type { CreateQuizInput } from "$lib/schemas/quiz";
  import { untrack } from "svelte";

  const { form, quizListHref } = createQuizForm();
  const { form: formData, enhance, submitting } = form;

  const chapters = $derived((page.data.chapters ?? []) as Chapter[]);

  let showExplanations = $state(false);

  const currentChapter = $derived(
    chapters.find((c) => c.id === $formData.chapterId)
  );

  const quizTypeItems = [
    { label: "Pilihan Ganda", value: "MULTIPLE_CHOICE" },
    { label: "Pilihan Banyak", value: "MULTIPLE_SELECT" },
    { label: "Isian Singkat", value: "FILL_IN_THE_BLANK" },
  ];

  const handleTypeChange = (value: string) => {
    const type = value as CreateQuizInput["type"];
    $formData.type = type;
    $formData.options = getDefaultOptions(type);
  };
</script>

<svelte:head>
  <title>Buat Quiz</title>
</svelte:head>

<form
  method="POST"
  class="mx-auto flex w-full max-w-2xl flex-col gap-5 bg-card text-card-foreground px-6 shadow-xs rounded-4xl py-6"
  novalidate
  use:enhance
>
  <Form.Field {form} name="type">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Tipe Soal</Form.Label>
        <Select.Root
          type="single"
          name="type"
          items={quizTypeItems}
          onValueChange={handleTypeChange}
          disabled={$submitting}
        >
          <Select.Trigger
            {...props}
            class="w-full"
            aria-label="Pilih tipe soal"
          >
            <span class="min-w-0 flex-1 truncate text-left"
              >{quizTypeItems.find((item) => item.value === $formData.type)
                ?.label ?? "Pilih tipe"}</span
            >
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Tipe Soal</Select.Label>
              {#each quizTypeItems as item (item.value)}
                <Select.Item value={item.value} label={item.label}>
                  {item.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="chapterId">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Chapter (opsional)</Form.Label>
        <Select.Root
          type="single"
          name="chapterId"
          items={[
            { label: "Tanpa chapter", value: "" },
            ...untrack(() => page.data.chapters ?? []).map((c: Chapter) => ({
              label: c.title,
              value: c.id,
            })),
          ]}
          onValueChange={(value: string) => {
            $formData.chapterId = value || undefined;
          }}
          disabled={$submitting}
        >
          <Select.Trigger {...props} class="w-full" aria-label="Pilih chapter">
            <span class="min-w-0 flex-1 truncate text-left"
              >{currentChapter?.title || "Tanpa Chapter"}</span
            >
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Tanpa Chapter</Select.Label>
              <Select.Item value="" label="Tanpa Chapter">
                Tanpa Chapter
              </Select.Item>
            </Select.Group>
            <Select.Group>
              <Select.Label>Chapter</Select.Label>
              {#each untrack(() => page.data.chapters ?? []) as chapter (chapter.id)}
                <Select.Item value={chapter.id} label={chapter.title}>
                  {chapter.title}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="questionText">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Soal</Form.Label>
        <Textarea
          {...props}
          bind:value={$formData.questionText}
          placeholder="Tulis pertanyaan..."
          rows={3}
          disabled={$submitting}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <div class="flex items-center gap-3 rounded-2xl border bg-background/50 p-3">
    <Switch
      id="show-explanations"
      bind:checked={showExplanations}
      disabled={$submitting}
    />
    <Label for="show-explanations">
      Tampilkan penjelasan untuk setiap opsi
    </Label>
  </div>

  {#if $formData.type === "MULTIPLE_CHOICE"}
    <MultipleChoiceFields
      {form}
      {formData}
      disabled={$submitting}
      showExplanation={showExplanations}
    />
  {:else if $formData.type === "MULTIPLE_SELECT"}
    <MultipleSelectFields
      {form}
      {formData}
      disabled={$submitting}
      showExplanation={showExplanations}
    />
  {:else if $formData.type === "FILL_IN_THE_BLANK"}
    <FillInTheBlankFields
      {form}
      {formData}
      disabled={$submitting}
      showExplanation={showExplanations}
    />
  {/if}

  <div class="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
    <Button
      class="w-full sm:w-auto"
      variant="outline"
      href={quizListHref}
      disabled={$submitting}
    >
      Batal
    </Button>
    <Form.Button class="w-full sm:w-auto" disabled={$submitting}>
      {$submitting ? "Membuat..." : "Buat Quiz"}
    </Form.Button>
  </div>
</form>
