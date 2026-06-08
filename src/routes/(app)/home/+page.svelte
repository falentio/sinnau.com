<script lang="ts">
  import FilterBar from "$lib/components/features/app/filter-bar.svelte";
  import StudySetEmpty from "$lib/components/features/app/study-set-empty.svelte";
  import StudySetItem from "$lib/components/features/app/study-set-item.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";

  let { data } = $props();

  const studySets = $derived(data.studySets);
  const pagination = $derived(data.pagination);
  const currentFilter = $derived(data.filter ?? null);
</script>

<div id="study-set-display" class="mx-auto flex w-full max-w-2xl flex-col px-6">
  <FilterBar {currentFilter} />
  {#if studySets.length === 0}
    <StudySetEmpty />
  {:else}
    <div class="flex flex-col overflow-hidden rounded-2xl shadow-xs">
      {#each studySets as studySet (studySet.id)}
        <StudySetItem {studySet} />
      {/each}
    </div>
    {#if pagination.totalPages > 1}
      <div class="my-4">
        <StudySetPagination {pagination} />
      </div>
    {/if}
  {/if}
</div>
