<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import type { ListQuizSessionsResponse } from "$lib/schemas/quiz-session";
  import {
    formatSessionTimestamp,
    sessionStatusLabel,
  } from "$lib/utils/quiz-session";
  import type { Snippet } from "svelte";

  interface ActiveProps {
    mode: "active";
    session: ListQuizSessionsResponse;
  }
  interface StartProps {
    children: Snippet;
    mode: "start";
  }
  type Props = ActiveProps | StartProps;
  let props: Props = $props();
</script>

<div class="rounded-4xl border bg-card p-1.5 shadow-xs">
  <div class="rounded-[calc(2rem-0.375rem)] bg-background/50 p-5">
    {#if props.mode === "active"}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span
            class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
          >
            {sessionStatusLabel(props.session.status)}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium">Sesi Aktif</p>
          <p class="truncate text-xs text-muted-foreground">
            {props.session.lastQuestionText
              ? `Pertanyaan terakhir: ${props.session.lastQuestionText}`
              : "Belum ada yang dijawab"}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {formatSessionTimestamp(props.session.createdAt.getTime())}
          </p>
        </div>
        <Button
          href="/session/{page.params.studySetId}/quiz/{props.session.id}/"
        >
          Lanjutkan
        </Button>
      </div>
    {:else}
      {@render props.children()}
    {/if}
  </div>
</div>
