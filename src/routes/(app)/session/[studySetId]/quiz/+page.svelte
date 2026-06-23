<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Add01Icon } from "$lib/components/features/icons";
  import NewSessionDialog from "$lib/components/features/quiz-session/new-session-dialog.svelte";
  import QuizSessionCard from "$lib/components/features/quiz-session/quiz-session-card.svelte";
  import QuizSessionEmpty from "$lib/components/features/quiz-session/quiz-session-empty.svelte";
  import QuizSessionListFilter from "$lib/components/features/quiz-session/quiz-session-list-filter.svelte";
  import QuizSessionRow from "$lib/components/features/quiz-session/quiz-session-row.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  const firstActive = $derived(data.activeSessions[0]);
  const showNewSessionButton = $derived(data.totalScopeCount > 0);

  let newSessionOpen = $state(false);

  const handleStatusFilter = (value: "all" | "active" | "completed") => {
    const url = new URL(page.url);
    url.searchParams.set("status", value);
    void goto(url, { keepFocus: true, noScroll: true });
  };
</script>

<div class="flex flex-col gap-6">
  {#if firstActive}
    <QuizSessionCard
      mode="active"
      session={firstActive}
      onNewSession={() => (newSessionOpen = true)}
    />
  {/if}

  {#if !data.activeSessions.length && !data.recentSessions.length}
    <QuizSessionEmpty onNewSession={() => (newSessionOpen = true)} />
  {/if}

  {#if data.recentSessions.length > 0}
    <section class="flex flex-col gap-3">
      <div class="flex justify-between">
        <h3 class="text-sm font-medium text-muted-foreground">
          Sesi Sebelumnya
        </h3>
        <Button
          variant="outline"
          size="icon-xs"
          onclick={() => (newSessionOpen = true)}
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
      </div>
      <QuizSessionListFilter
        value={data.statusFilter}
        counts={data.recentCounts}
        onChange={handleStatusFilter}
      />
      <div class="rounded-2xl border bg-card px-4 shadow-xs">
        {#each data.recentSessions as session (session.id)}
          <QuizSessionRow {session} />
        {/each}
      </div>
    </section>
  {/if}
</div>

<NewSessionDialog
  bind:open={newSessionOpen}
  chapters={data.chapters}
  chapterQuizCounts={data.chapterQuizCounts}
  totalScopeCount={data.totalScopeCount}
/>
