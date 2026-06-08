<script lang="ts">
  import { page } from "$app/state";
  import ChapterSelect from "$lib/components/features/chapter/chapter-select.svelte";
  import { ButtonGroup } from "$lib/components/ui/button-group/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import type { QuizType } from "$lib/schemas/quiz.constant";

  import DevCreateEntityDialog from "./dev-create-entity-dialog.svelte";

  interface ChapterOption {
    id: string;
    title: string;
  }

  interface Props {
    open: boolean;
    studySetId: string;
    chapters: ChapterOption[];
  }

  let { open = $bindable(false), studySetId, chapters }: Props = $props();

  let count = $state(10);
  let quizType = $state<QuizType>("MULTIPLE_CHOICE");

  const QUIZ_TYPE_OPTIONS = [
    { label: "Pilihan Ganda", value: "MULTIPLE_CHOICE" as const },
    { label: "Pilihan Banyak", value: "MULTIPLE_SELECT" as const },
    { label: "Isian Singkat", value: "FILL_IN_THE_BLANK" as const },
  ];

  const stubOptionsForType = (type: QuizType) => {
    if (type === "FILL_IN_THE_BLANK") {
      return [
        {
          explanation: "Penjelasan stub untuk opsi isian singkat",
          isCorrect: true,
          optionText: "jawaban-stub",
        },
      ];
    }
    if (type === "MULTIPLE_CHOICE") {
      return [
        {
          explanation: "Penjelasan stub untuk opsi A (benar)",
          isCorrect: true,
          optionText: "Opsi A (benar)",
        },
        {
          explanation: "Penjelasan stub untuk opsi B",
          isCorrect: false,
          optionText: "Opsi B",
        },
        {
          explanation: "Penjelasan stub untuk opsi C",
          isCorrect: false,
          optionText: "Opsi C",
        },
        {
          explanation: "Penjelasan stub untuk opsi D",
          isCorrect: false,
          optionText: "Opsi D",
        },
      ];
    }
    return [
      {
        explanation: "Penjelasan stub untuk opsi A (benar)",
        isCorrect: true,
        optionText: "Opsi A (benar)",
      },
      {
        explanation: "Penjelasan stub untuk opsi B (benar)",
        isCorrect: true,
        optionText: "Opsi B (benar)",
      },
      {
        explanation: "Penjelasan stub untuk opsi C",
        isCorrect: false,
        optionText: "Opsi C",
      },
      {
        explanation: "Penjelasan stub untuk opsi D",
        isCorrect: false,
        optionText: "Opsi D",
      },
    ];
  };

  const onSubmit = async (submitCount: number) => {
    if (!studySetId) {
      throw new Error("Study set tidak ditemukan");
    }
    const chapterId = page.url.searchParams.get("chapter") ?? undefined;
    for (let i = 1; i <= submitCount; i += 1) {
      // oxlint-disable-next-line no-await-in-loop -- dev-only seeding, not user-facing
      await client.quiz.create({
        chapterId,
        options: stubOptionsForType(quizType),
        questionText: `Pertanyaan stub #${i}-${Math.random().toString(36).slice(2, 5)}?`,
        studySetId,
        type: quizType,
      });
    }
  };
</script>

<DevCreateEntityDialog
  bind:open
  bind:count
  title="Buat quiz (Dev)"
  description="Tentukan jumlah quiz dummy yang akan dibuat untuk stub."
  max={100}
  submitLabel="Buat"
  successMessage={(n) => `${n} quiz berhasil dibuat.`}
  fallbackError="Quiz belum bisa dibuat. Coba lagi sebentar."
  {onSubmit}
>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">Chapter</span>
    <ChapterSelect {chapters} />
  </div>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">Tipe quiz</span>
    <ButtonGroup>
      {#each QUIZ_TYPE_OPTIONS as opt (opt.value)}
        <Button
          variant={quizType === opt.value ? "default" : "outline"}
          size="sm"
          onclick={() => (quizType = opt.value)}
        >
          {opt.label}
        </Button>
      {/each}
    </ButtonGroup>
  </div>
</DevCreateEntityDialog>
