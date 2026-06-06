<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Pagination from '$lib/components/ui/pagination/index.js';

	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import QuizFilterBar from '$lib/components/features/quiz/quiz-filter-bar.svelte';
	import { ChatQuestion01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const quizzes = $derived(data.quizzes);
	const currentFilter = $derived(data.filter ?? null);

	const openExplanation = $state(false);
	const pageIndex = $derived(Number(pageStore.url.searchParams.get('page')) || 1);

	const displayedQuizzes = $derived(quizzes.slice((pageIndex - 1) * 10, pageIndex * 10));

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
	<h2 class="font-medium">Quiz ({quizzes.length})</h2>
	<div>
		<Button variant="outline" size="icon-sm" href="create">
			<HugeiconsIcon icon={PlusSignIcon} />
		</Button>
	</div>
</div>
<QuizFilterBar {currentFilter} />

<div class="space-y-3">
	{#each displayedQuizzes as quiz, i (quiz.id)}
		<div class="rounded-4xl bg-card text-card-foreground shadow-xs">
			<div class=" p-6">
				<div class="flex items-center gap-2">
					<Badge variant="outline">Soal #{i + 1}</Badge>
					<Badge variant="secondary">Pilihan Ganda</Badge>
					<span class="flex-auto"></span>
					<Button
						onclick={(e) => {
							openExplanation = !openExplanation;
							requestAnimationFrame(() => {
								e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
							});
						}}
						variant={openExplanation ? 'outline' : 'ghost'}
						size="icon-sm"
					>
						<HugeiconsIcon icon={ChatQuestion01Icon} />
					</Button>
				</div>
				<h3 class="mt-3 text-lg font-semibold">{quiz.questionText}</h3>

				<div class="mt-4 grid gap-2">
					{#each quiz.options as option, optionIndex (option.id)}
						<div class="flex items-center gap-3 rounded-2xl border bg-background/50 p-4">
							<div
								class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
							>
								{String.fromCharCode(65 + optionIndex)}
							</div>
							<div class="min-w-0 flex-1">
								<div class=" gap-2">
									{#if option.isCorrect}
										<Badge class="inline-flex">Jawaban benar</Badge>
									{/if}
									<p class="font-medium">{option.optionText}</p>
								</div>
								{#if option.explanation && openExplanation}
									<p class="mt-1 text-sm text-muted-foreground">{option.explanation}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

<div>
	<Pagination.Root
		count={quizzes.length}
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
