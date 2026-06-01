<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PaginationContent from '$lib/components/ui/pagination/pagination-content.svelte';
	import PaginationEllipsis from '$lib/components/ui/pagination/pagination-ellipsis.svelte';
	import PaginationItem from '$lib/components/ui/pagination/pagination-item.svelte';
	import PaginationLink from '$lib/components/ui/pagination/pagination-link.svelte';
	import Pagination from '$lib/components/ui/pagination/pagination.svelte';

	import { PlusSignIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	type FlashcardStub = {
		id: string;
		front: string;
		back: string;
		hint?: string;
	};

	const flashcards: FlashcardStub[] = [
		{
			id: 'flc_000000000000000001',
			front: 'Apa itu vektor?',
			back: 'Objek yang memiliki besar dan arah dalam ruang.',
			hint: 'Bayangkan panah pada bidang koordinat.'
		},
		{
			id: 'flc_000000000000000002',
			front: 'Apa itu matriks identitas?',
			back: 'Matriks diagonal dengan nilai 1 pada diagonal utama.'
		},
		{
			id: 'flc_000000000000000003',
			front: 'Apa itu determinan?',
			back: 'Nilai skalar yang menunjukkan sifat matriks bujur sangkar.',
			hint: 'Bernilai 0 ketika matriks singular.'
		},
		{
			id: 'flc_000000000000000004',
			front: 'Apa itu transpose?',
			back: 'Operasi menukar baris menjadi kolom pada sebuah matriks.'
		},
		{
			id: 'flc_000000000000000005',
			front: 'Apa itu rank matriks?',
			back: 'Jumlah maksimum baris atau kolom yang bebas linear.'
		}
	];

	let pageIndex = $state(1);
</script>

<div class="flex items-center justify-between">
	<h2 class="font-medium">Flashcard ({flashcards.length})</h2>
	<div>
		<Button variant="outline" size="icon-sm" href="create">
			<HugeiconsIcon icon={PlusSignIcon} />
		</Button>
	</div>
</div>
<div class="flex w-min gap-1 rounded-full bg-card p-1 text-card-foreground shadow-2xs">
	<Button variant="outline">Terbaru</Button>
	<Button variant="ghost">Terlama</Button>
	<Button variant="ghost">Target Hari Ini</Button>
	<Button variant="ghost">Penting</Button>
</div>

<div class="rounded-4xl bg-card text-card-foreground">
	{#each flashcards.slice((pageIndex - 1) * 10, pageIndex * 10) as flashcard, i (flashcard.id)}
		<div class="border-b p-6">
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
	<Pagination count={flashcards.length} bind:page={pageIndex} perPage={10}>
		{#snippet children({ currentPage, pages })}
			<PaginationContent>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
					{:else}
						<PaginationItem>
							<PaginationLink isActive={page.value === currentPage} {page}
								>{page.value}</PaginationLink
							>
						</PaginationItem>
					{/if}
				{/each}
			</PaginationContent>
		{/snippet}
	</Pagination>
</div>
