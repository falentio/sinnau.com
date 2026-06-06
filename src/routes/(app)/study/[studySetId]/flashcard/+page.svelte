<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Pagination from '$lib/components/ui/pagination/index.js';

	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import FlashcardFilterBar from '$lib/components/features/flashcard/flashcard-filter-bar.svelte';
	import { PlusSignIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const flashcards = $derived(data.flashcards);
	const currentFilter = $derived(data.filter ?? null);

	const pageIndex = $derived(Number(pageStore.url.searchParams.get('page')) || 1);

	const displayedFlashcards = $derived(flashcards.slice((pageIndex - 1) * 10, pageIndex * 10));

	const handlePageChange = (p: number) => {
		const params = new SvelteURLSearchParams();
		if (p > 1) {params.set('page', String(p));}
		if (currentFilter) {params.set('filter', currentFilter);}
		const query = params.toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`.?${query}`, { noScroll: true, replaceState: true });
	}
</script>

<div class="flex items-center justify-between">
	<h2 class="font-medium">Flashcard ({flashcards.length})</h2>
	<div>
		<Button variant="outline" size="icon-sm" href="create">
			<HugeiconsIcon icon={PlusSignIcon} />
		</Button>
	</div>
</div>
<FlashcardFilterBar {currentFilter} />

<div class="rounded-4xl bg-card text-card-foreground">
	{#each displayedFlashcards as flashcard, i (flashcard.id)}
		<div class="border-b p-6 last:border-b-0">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold">{flashcard.front}</h3>
				{#if i % 5 === 0}
					<span class="flex-auto"></span>
					<Badge variant="outline">Penting</Badge>
				{/if}
			</div>
			<p class="text-sm text-muted-foreground">{flashcard.back}</p>
			{#if flashcard.hint}
				<p class="mt-1 text-sm text-muted-foreground italic">Hint: {flashcard.hint}</p>
			{/if}
		</div>
	{/each}
</div>

<div>
	<Pagination.Root
		count={flashcards.length}
		page={pageIndex}
		onPageChange={handlePageChange}
		perPage={10}
	>
		{#snippet children({ currentPage, pages })}
			<Pagination.Content>
				<Pagination.Item class="max-md:hidden">
					<Pagination.PrevButton />
				</Pagination.Item>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else}
						<Pagination.Item>
							<Pagination.Link isActive={page.value === currentPage} {page}
								>{page.value}</Pagination.Link
							>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item class="max-md:hidden">
					<Pagination.NextButton />
				</Pagination.Item>
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>
