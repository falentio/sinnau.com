<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ChapterScopePicker from "$lib/components/features/quiz-session/chapter-scope-picker.svelte";
  import QuizSessionCard from "$lib/components/features/quiz-session/quiz-session-card.svelte";
  import QuizSessionEmpty from "$lib/components/features/quiz-session/quiz-session-empty.svelte";
  import QuizSessionListFilter from "$lib/components/features/quiz-session/quiz-session-list-filter.svelte";
  import QuizSessionRow from "$lib/components/features/quiz-session/quiz-session-row.svelte";
  import Button from "$lib/components/ui/button/button.svelte";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  const chapters = $derived(data.chapters);
  const firstActive = $derived(data.activeSessions[0]);
  const startDisabled = $derived(data.totalScopeCount === 0);

  const handleChapterPick = (chapterId: string | null) => {
    const url = new URL(page.url);
    if (chapterId === null) {
      url.searchParams.delete("chapter");
    } else {
      url.searchParams.set("chapter", chapterId);
    }
    void goto(url, { keepFocus: true, noScroll: true });
  };

  const handleStatusFilter = (value: "all" | "active" | "completed") => {
    const url = new URL(page.url);
    url.searchParams.set("status", value);
    void goto(url, { keepFocus: true, noScroll: true });
  };
</script>

<div class="flex flex-col gap-6">
  {#if firstActive}
    <QuizSessionCard mode="active" session={firstActive} />
  {/if}

  {#if data.totalScopeCount > 0}
    <QuizSessionCard mode="start">
      <div class="flex flex-col gap-4">
        <h2 class="text-base font-semibold">Mulai Sesi Baru</h2>
        <ChapterScopePicker
          value={data.scope.chapterId}
          {chapters}
          counts={{
            all: data.totalScopeCount,
            byChapter: data.chapterQuizCounts,
          }}
          onChange={handleChapterPick}
        />
        <form method="POST" action="?/createSession" use:enhance>
          <input
            type="hidden"
            name="chapterId"
            value={data.scope.chapterId ?? ""}
          />
          <Button type="submit" disabled={startDisabled}>Mulai</Button>
        </form>
      </div>
    </QuizSessionCard>
  {:else}
    <QuizSessionEmpty />
  {/if}

  {#if data.recentSessions.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">Sesi Sebelumnya</h3>
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
