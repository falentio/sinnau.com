<script lang="ts">
  import { page } from "$app/state";
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import type { ListQuizSessionsResponse } from "$lib/schemas/quiz-session";
  import {
    formatSessionTimestamp,
    sessionStatusLabel,
  } from "$lib/utils/quiz-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    session: ListQuizSessionsResponse;
  }
  let { session }: Props = $props();

  const target = $derived(
    session.status === "ACTIVE"
      ? `/session/${page.params.studySetId}/quiz/${session.id}/`
      : `/session/${page.params.studySetId}/quiz/${session.id}/results/`
  );

  const score = $derived(
    session.score !== null && session.totalQuestions
      ? `Skor ${session.score}`
      : "—"
  );
</script>

<a
  href={target}
  class="flex items-center gap-3 border-b px-1 py-3 transition-colors hover:bg-muted/50"
>
  <span
    class="rounded-full px-2 py-0.5 text-xs font-medium {session.status ===
    'ACTIVE'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-emerald-100 text-emerald-700'}"
  >
    {sessionStatusLabel(session.status)}
  </span>
  <span class="flex-1 truncate text-sm text-foreground">
    {session.lastQuestionText ?? "—"}
  </span>
  <span class="text-xs text-muted-foreground">
    {formatSessionTimestamp(session.createdAt.getTime())}
  </span>
  <span class="w-20 text-right text-sm tabular-nums text-muted-foreground">
    {score}
  </span>
  <HugeiconsIcon icon={ArrowRight01Icon} class="size-4 text-muted-foreground" />
</a>
