<script lang="ts">
  import { page } from "$app/state";
  import {
    ArrowLeft01Icon,
    ConfusedIcon,
    HappyIcon,
    IdeaIcon,
    SadDizzyIcon,
    SadIcon,
  } from "$lib/components/features/icons";
  import Button, {
    buttonVariants,
  } from "$lib/components/ui/button/button.svelte";
  import PopoverContent from "$lib/components/ui/popover/popover-content.svelte";
  import PopoverTrigger from "$lib/components/ui/popover/popover-trigger.svelte";
  import Popover from "$lib/components/ui/popover/popover.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const flashcard = {
    back: "Objek yang memiliki besar dan arah dalam ruang.",
    front: "Apa itu vektor?",
    hint: "Bayangkan panah pada bidang koordinat.",
    id: "flc_000000000000000001",
  };

  const ratings = [
    {
      class:
        "border-red-200 bg-red-50/70 text-red-700 shadow-xs hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30",
      icon: SadDizzyIcon,
      interval: "1 jam",
      label: "Lupa",
    },
    {
      class:
        "border-orange-200 bg-orange-50/70 text-orange-700 shadow-xs hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-300 dark:hover:bg-orange-950/30",
      icon: SadIcon,
      interval: "6 jam",
      label: "Sulit",
    },
    {
      class:
        "border-blue-200 bg-blue-50/70 text-blue-700 shadow-xs hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-950/30",
      icon: ConfusedIcon,
      interval: "1 hari",
      label: "Cukup",
    },
    {
      class:
        "border-green-200 bg-green-50/70 text-green-700 shadow-xs hover:border-green-300 hover:bg-green-50 hover:text-green-800 dark:border-green-900/60 dark:bg-green-950/20 dark:text-green-300 dark:hover:bg-green-950/30",
      icon: HappyIcon,
      interval: "3 hari",
      label: "Mudah",
    },
  ] as const;
</script>

<div>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    <div>
      <Button variant="ghost" href="/study/{page.params.studySetId}/flashcard/">
        <HugeiconsIcon icon={ArrowLeft01Icon} />
        <span>Aljabar Linear</span>
      </Button>
    </div>
    <label
      class="relative aspect-square w-full cursor-pointer *:size-full *:overflow-hidden *:rounded-4xl *:bg-card *:text-card-foreground *:shadow-xs *:transition-transform *:duration-500 *:backface-hidden"
    >
      <input checked type="checkbox" class="peer sr-only" />
      <div class="rotate-y-180 peer-checked:rotate-y-0">
        <div class="flex size-full items-center justify-center p-6 text-center">
          {flashcard.front}
        </div>
      </div>
      <div class="absolute inset-0 peer-checked:rotate-y-180">
        <div class="flex size-full items-center justify-center p-6 text-center">
          {flashcard.back}
        </div>
      </div>
    </label>
    <div
      class="flex flex-col gap-3 rounded-4xl bg-card px-4 py-4 text-card-foreground shadow-xs"
    >
      <div class="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 class="font-semibold">Seberapa Paham Kamu?</h2>
          <p class="text-xs text-muted-foreground">
            Pilih untuk menjadwalkan pengulangan.
          </p>
        </div>
        <div>
          <Popover>
            <PopoverTrigger
              class={buttonVariants({ size: "icon-sm", variant: "outline" })}
            >
              <HugeiconsIcon icon={IdeaIcon} />
            </PopoverTrigger>
            <PopoverContent class="mr-6">
              <div>
                {flashcard.hint}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        {#each ratings as rating (rating.label)}
          <Button
            variant="outline"
            class="h-auto min-h-21 min-w-0 flex-col gap-1.5 rounded-3xl px-1.5 py-2 text-xs transition-all hover:shadow-sm {rating.class}"
            aria-label="{rating.label}, ulangi dalam {rating.interval}"
          >
            <HugeiconsIcon icon={rating.icon} class="size-8" />
            <span class="font-medium">{rating.label}</span>
          </Button>
        {/each}
      </div>
    </div>
  </div>
</div>
