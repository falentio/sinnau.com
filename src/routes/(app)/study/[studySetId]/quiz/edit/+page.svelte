<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import {
    MCQ_OPTION_COUNT_HINT,
    MS_OPTION_COUNT_HINT,
    updateQuizInputSchema,
  } from "$lib/schemas/quiz";
  import type { UpdateQuizInput } from "$lib/schemas/quiz";
  import {
    QUIZ_OPTION_TEXT_MAX_LENGTH,
    QUIZ_QUESTION_TEXT_MAX_LENGTH,
  } from "$lib/schemas/quiz.constant";
  import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import * as v from "valibot";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const quiz = $derived(data.quiz);
  const studySetId = $derived(page.params.studySetId ?? "");
  const chapters = $derived<{ id: string; title: string }[]>(
    page.data.chapters ?? []
  );

  const quizListHref = $derived(
    resolve("/(app)/study/[studySetId]/quiz", { studySetId })
  );

  const formSchema = v.omit(updateQuizInputSchema, ["id"]);

  type EditQuizFormData = v.InferInput<typeof formSchema>;

  const init = untrack(() => ({
    chapterId: quiz.chapterId,
    options: quiz.options.map((o) => ({
      explanation: o.explanation ?? "",
      id: o.id,
      isCorrect: o.isCorrect,
      optionText: o.optionText,
    })),
    questionText: quiz.questionText,
  }));

  const form = superForm(
    defaults<EditQuizFormData>(init, valibotClient(formSchema)),
    {
      SPA: true,
      dataType: "json",
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        try {
          await client.quiz.update({
            ...submittedForm.data,
            id: quiz.id,
          } as UpdateQuizInput);
          toast.success("Quiz berhasil diperbarui.", {
            position: "top-right",
          });
          await invalidate(`quiz:list:${studySetId}`);
          await goto(quizListHref);
        } catch (error) {
          if (error instanceof ORPCError) {
            if (error.code === "UNAUTHORIZED") {
              await goto(resolve("/(auth)/login"));
              return;
            }
            toast.error(error.message, { position: "top-right" });
          } else if (error instanceof Error) {
            toast.error(error.message, { position: "top-right" });
          } else {
            toast.error("Quiz belum bisa diperbarui. Coba lagi sebentar.", {
              position: "top-right",
            });
          }
        }
      },
      resetForm: false,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;

  let showExplanations = $state(false);

  const getTypeLabel = (type: string) => {
    if (type === "MULTIPLE_CHOICE") {
      return "Pilihan Ganda";
    }
    if (type === "MULTIPLE_SELECT") {
      return "Pilihan Ganda Kompleks";
    }
    return "Isian";
  };

  const currentChapterLabel = $derived(
    $formData.chapterId
      ? (chapters.find((c) => c.id === $formData.chapterId)?.title ??
          "Tanpa Chapter")
      : "Tanpa Chapter"
  );

  const questionTextCount = $derived(($formData.questionText ?? "").length);

  const optionsLength = $derived($formData.options?.length ?? 0);

  const getFdOptions = (): NonNullable<EditQuizFormData["options"]> =>
    $formData.options ?? [];

  const addMcqOption = () => {
    const opts = getFdOptions();
    if (opts.length >= MCQ_OPTION_COUNT_HINT.max) {
      return;
    }
    $formData.options = [
      ...opts,
      { explanation: "", isCorrect: false, optionText: "" },
    ];
  };

  const removeMcqOption = (index: number) => {
    const opts = getFdOptions();
    if (opts.length <= MCQ_OPTION_COUNT_HINT.min) {
      return;
    }
    const removedIsCorrect = opts[index]?.isCorrect;
    $formData.options = opts.filter((_, i) => i !== index);
    if (removedIsCorrect) {
      const newOpts = getFdOptions();
      if (!newOpts.some((o) => o.isCorrect)) {
        $formData.options = newOpts.map((opt, i) =>
          i === 0 ? { ...opt, isCorrect: true } : opt
        );
      }
    }
  };

  const setCorrect = (index: number) => {
    const opts = getFdOptions();
    $formData.options = opts.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
  };

  const addMsOption = () => {
    const opts = getFdOptions();
    if (opts.length >= MS_OPTION_COUNT_HINT.max) {
      return;
    }
    $formData.options = [
      ...opts,
      { explanation: "", isCorrect: false, optionText: "" },
    ];
  };

  const removeMsOption = (index: number) => {
    const opts = getFdOptions();
    if (opts.length <= MS_OPTION_COUNT_HINT.min) {
      return;
    }
    $formData.options = opts.filter((_, i) => i !== index);
  };

  const toggleCorrect = (index: number) => {
    const opts = getFdOptions();
    $formData.options = opts.map((opt, i) =>
      i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt
    );
  };
</script>

<svelte:head>
  <title>Edit Quiz</title>
</svelte:head>

<form
  method="POST"
  class="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-4xl bg-card px-6 py-6 text-card-foreground shadow-xs"
  novalidate
  use:enhance
>
  <div class="flex items-center gap-3">
    <h2 class="text-lg font-semibold">Edit Quiz</h2>
    <Badge variant="secondary">{getTypeLabel(quiz.type)}</Badge>
  </div>

  <Form.Field {form} name="chapterId">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Chapter (opsional)</Form.Label>
        <Select.Root
          type="single"
          items={[
            { label: "Tanpa chapter", value: "" },
            ...chapters.map((c) => ({
              label: c.title,
              value: c.id,
            })),
          ]}
          value={$formData.chapterId ?? ""}
          onValueChange={(value: string) => {
            $formData.chapterId = value || null;
          }}
          disabled={$submitting}
        >
          <Select.Trigger {...props} class="w-full" aria-label="Pilih chapter">
            <span class="min-w-0 flex-1 truncate text-left"
              >{currentChapterLabel}</span
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
              {#each chapters as chapter (chapter.id)}
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
        <div class="flex items-center justify-between gap-3">
          <Form.Label>Soal</Form.Label>
          <span class="text-xs text-muted-foreground"
            >{questionTextCount}/{QUIZ_QUESTION_TEXT_MAX_LENGTH}</span
          >
        </div>
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

  {#if quiz.type === "MULTIPLE_CHOICE"}
    <Form.Fieldset {form} name="options">
      <Form.Legend>Pilihan Jawaban</Form.Legend>

      {#each getFdOptions() as _, i (i)}
        <div
          class="flex items-start gap-3 rounded-2xl border bg-background/50 p-3"
        >
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
                    bind:value={$formData.options![i]!.optionText}
                    placeholder="Opsi {String.fromCharCode(65 + i)}"
                    maxlength={QUIZ_OPTION_TEXT_MAX_LENGTH}
                    disabled={$submitting}
                  />
                {/snippet}
              </Form.Control>
              <Form.FieldErrors />
            </Form.ElementField>

            <button
              type="button"
              onclick={() => setCorrect(i)}
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors {$formData
                .options?.[i]?.isCorrect
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-accent'}"
              disabled={$submitting}
            >
              {#if $formData.options?.[i]?.isCorrect}
                <HugeiconsIcon icon={Tick02Icon} size={14} class="shrink-0" />
                Jawaban Benar
              {:else}
                <HugeiconsIcon icon={Cancel01Icon} size={14} class="shrink-0" />
                Jawaban Salah
              {/if}
            </button>

            {#if showExplanations}
              <Form.ElementField {form} name={`options[${i}].explanation`}>
                <Form.Control>
                  {#snippet children({ props })}
                    <Input
                      {...props}
                      bind:value={$formData.options![i]!.explanation}
                      placeholder="Penjelasan (opsional)"
                      disabled={$submitting}
                    />
                  {/snippet}
                </Form.Control>
                <Form.FieldErrors />
              </Form.ElementField>
            {/if}
          </div>

          <button
            type="button"
            onclick={() => removeMcqOption(i)}
            class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={$submitting || optionsLength <= MCQ_OPTION_COUNT_HINT.min}
            aria-label="Hapus opsi {String.fromCharCode(65 + i)}"
          >
            ✕
          </button>
        </div>
      {/each}

      <Form.FieldErrors />
    </Form.Fieldset>

    {#if optionsLength < MCQ_OPTION_COUNT_HINT.max}
      <button
        type="button"
        onclick={addMcqOption}
        class="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
        disabled={$submitting}
      >
        + Tambah Opsi ({optionsLength}/{MCQ_OPTION_COUNT_HINT.max})
      </button>
    {/if}
  {:else if quiz.type === "MULTIPLE_SELECT"}
    <Form.Fieldset {form} name="options">
      <Form.Legend>Pilihan Jawaban</Form.Legend>

      {#each getFdOptions() as _, i (i)}
        <div
          class="flex items-start gap-3 rounded-2xl border bg-background/50 p-3"
        >
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
                    bind:value={$formData.options![i]!.optionText}
                    placeholder="Opsi {String.fromCharCode(65 + i)}"
                    maxlength={QUIZ_OPTION_TEXT_MAX_LENGTH}
                    disabled={$submitting}
                  />
                {/snippet}
              </Form.Control>
              <Form.FieldErrors />
            </Form.ElementField>

            <button
              type="button"
              onclick={() => toggleCorrect(i)}
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors {$formData
                .options?.[i]?.isCorrect
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-accent'}"
              disabled={$submitting}
            >
              {#if $formData.options?.[i]?.isCorrect}
                <HugeiconsIcon icon={Tick02Icon} size={14} class="shrink-0" />
                Jawaban Benar
              {:else}
                <HugeiconsIcon icon={Cancel01Icon} size={14} class="shrink-0" />
                Jawaban Salah
              {/if}
            </button>

            {#if showExplanations}
              <Form.ElementField {form} name={`options[${i}].explanation`}>
                <Form.Control>
                  {#snippet children({ props })}
                    <Input
                      {...props}
                      bind:value={$formData.options![i]!.explanation}
                      placeholder="Penjelasan (opsional)"
                      disabled={$submitting}
                    />
                  {/snippet}
                </Form.Control>
                <Form.FieldErrors />
              </Form.ElementField>
            {/if}
          </div>

          <button
            type="button"
            onclick={() => removeMsOption(i)}
            class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={$submitting || optionsLength <= MS_OPTION_COUNT_HINT.min}
            aria-label="Hapus opsi {String.fromCharCode(65 + i)}"
          >
            ✕
          </button>
        </div>
      {/each}

      <Form.FieldErrors />
    </Form.Fieldset>

    {#if optionsLength < MS_OPTION_COUNT_HINT.max}
      <button
        type="button"
        onclick={addMsOption}
        class="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
        disabled={$submitting}
      >
        + Tambah Opsi ({optionsLength}/{MS_OPTION_COUNT_HINT.max})
      </button>
    {/if}
  {:else}
    <Form.Fieldset form={form as any} name="options">
      <Form.ElementField
        form={form as any}
        name={`options[0].optionText` as any}
      >
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Kunci Jawaban</Form.Label>
            <Input
              {...props}
              bind:value={$formData.options![0]!.optionText}
              placeholder="Ketik jawaban yang benar..."
              maxlength={QUIZ_OPTION_TEXT_MAX_LENGTH}
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.ElementField>

      {#if showExplanations}
        <Form.ElementField {form} name={`options[0].explanation`}>
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Penjelasan (opsional)</Form.Label>
              <Input
                {...props}
                bind:value={$formData.options![0]!.explanation}
                placeholder="Jelaskan kenapa jawaban ini benar..."
                disabled={$submitting}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.ElementField>
      {/if}

      <Form.FieldErrors />
    </Form.Fieldset>
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
      {$submitting ? "Menyimpan..." : "Simpan"}
    </Form.Button>
  </div>
</form>
