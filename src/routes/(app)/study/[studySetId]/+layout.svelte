<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		AiChat02Icon,
		ArrowLeft01Icon,
		Book03Icon,
		Cards02Icon,
		Quiz02Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	const { children } = $props() as Props;

	type ChapterStub = {
		id: string;
		title: string;
		description: string;
	};

	const stubTimestamp = new Date('2026-05-10T00:00:00.000Z');
	const stubStudySetId = 'sst_000000000000000001';

	const chaptersStub: ChapterStub[] = [
		{
			id: 'chp_000000000000000001',
			title: 'Vektor Dasar',
			description: 'Mengenal besaran, arah, dan operasi vektor sederhana.'
		},
		{
			id: 'chp_000000000000000002',
			title: 'Matriks dan Operasi',
			description: 'Baris, kolom, penjumlahan, dan perkalian matriks.'
		},
		{
			id: 'chp_000000000000000003',
			title: 'Determinan dan Invers',
			description: 'Mengukur sifat matriks bujur sangkar dan kebalikannya.'
		},
		{
			id: 'chp_000000000000000004',
			title: 'Sistem Persamaan Linear',
			description: 'Penyelesaian SPL dengan eliminasi dan substitusi.'
		},
		{
			id: 'chp_000000000000000005',
			title: 'Ruang Vektor dan Basis',
			description: 'Span, bebas linear, basis, dan dimensi ruang.'
		},
		{
			id: 'chp_000000000000000006',
			title: 'Eigenvalue dan Eigenvector',
			description: 'Nilai khas dan vektor khas dari transformasi linear.'
		}
	];

	const chapterItems = chaptersStub.map((chapter) => ({
		value: chapter.id,
		label: chapter.title
	}));

	let selectedChapterId = $state(chaptersStub[0]?.id ?? '');

	const selectedChapter = $derived(
		chaptersStub.find((chapter) => chapter.id === selectedChapterId)
	);
</script>

<div
	class="bg-card text-card-foreground shadow-sm data-[hidden=true]:hidden"
	data-hidden={page.route.id?.includes('waiting-room')}
>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
		<div class="-ml-3 w-min transition-all hover:ml-0">
			<Button variant="ghost" href="/home/">
				<HugeiconsIcon icon={ArrowLeft01Icon} />
				Kembali
			</Button>
		</div>
		<div>
			<div class="w-min rounded-lg bg-primary/10 p-3 text-primary">
				<HugeiconsIcon class="size-8" icon={Book03Icon} />
			</div>
		</div>
		<div>
			<h1 class="text-lg font-semibold">Aljabar Linear</h1>
			<span class="text-sm text-muted-foreground">
				Mempelajari konsep dasar aljabar linear termasuk vektor, matriks, sistem persamaan linear,
				dan transformasi linear untuk aplikasi praktis.
			</span>
		</div>
		<Select.Root type="single" name="chapterId" items={chapterItems} bind:value={selectedChapterId}>
			<Select.Trigger class="w-full" aria-label="Pilih chapter">
				<span class="min-w-0 flex-1 truncate text-left">
					{selectedChapter?.title ?? 'Pilih chapter'}
				</span>
			</Select.Trigger>
			<Select.Content class="max-h-72">
				<Select.Group>
					<Select.Label>Chapter</Select.Label>
					{#each chaptersStub as chapter (chapter.id)}
						<Select.Item value={chapter.id} label={chapter.title}>
							{chapter.title}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
		<div>
			<Button
				href="/study/{page.params.studySetId}/flashcard/"
				variant={page.url.pathname.includes('flashcard') ? 'outline' : 'ghost'}
			>
				<HugeiconsIcon icon={Cards02Icon} />
				Flashcard
			</Button>
			<Button
				href="/study/{page.params.studySetId}/quiz/"
				variant={page.url.pathname.includes('quiz') ? 'outline' : 'ghost'}
			>
				<HugeiconsIcon icon={Quiz02Icon} />
				Quiz
			</Button>
			<Button variant="ghost">
				<HugeiconsIcon icon={AiChat02Icon} />
				Tanya AI
			</Button>
		</div>
	</div>
</div>

<div>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
