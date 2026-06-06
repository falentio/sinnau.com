<script lang="ts">
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import DevCreateChapterDialog from '$lib/components/features/dev/dev-create-chapter-dialog.svelte';
	import DevCreateFlashcardDialog from '$lib/components/features/dev/dev-create-flashcard-dialog.svelte';
	import DevCreateQuizDialog from '$lib/components/features/dev/dev-create-quiz-dialog.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		Add01Icon,
		AiChat02Icon,
		ArrowLeft01Icon,
		Book03Icon,
		BookOpen01Icon,
		Cards02Icon,
		Delete01Icon,
		Edit01Icon,
		Quiz01Icon,
		Quiz02Icon,
		Settings02Icon,
		Share01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { untrack } from 'svelte';
import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	interface Props {
		children: Snippet;
		data: LayoutData;
	}

	const { children, data } = $props() as Props;

	const stubTimestamp = new Date('2026-05-10T00:00:00.000Z');
	const stubStudySetId = 'sst_000000000000000001';

	const chapterItems = $derived(
		data.chapters.map((chapter) => ({
			label: chapter.title,
			value: chapter.id
		}))
	);

	let selectedChapterId = $state(untrack(() => data.chapters[0]?.id ?? ''));

	const selectedChapter = $derived(
		data.chapters.find((chapter) => chapter.id === selectedChapterId)
	);

	const studySetId = $derived(page.params.studySetId ?? '');

	let flashcardDialogOpen = $state(false);
	let chapterDialogOpen = $state(false);
	let quizDialogOpen = $state(false);
</script>

<div
	class="bg-card text-card-foreground shadow-sm data-[hidden=true]:hidden"
	data-hidden={page.route.id?.includes('waiting-room')}
>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
		<div class="flex w-full justify-between">
			<div class="-ml-3 w-min transition-all hover:ml-0">
				<Button variant="ghost" href="/home/">
					<HugeiconsIcon icon={ArrowLeft01Icon} />
					Kembali
				</Button>
			</div>
			<div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon">
								<HugeiconsIcon icon={Settings02Icon} />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>
							<HugeiconsIcon icon={Edit01Icon} />
							Edit set
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<HugeiconsIcon icon={Delete01Icon} />
							Hapus set
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<HugeiconsIcon icon={Share01Icon} />
							Bagikan
						</DropdownMenu.Item>
						{#if dev}
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={() => (flashcardDialogOpen = true)}>
								<HugeiconsIcon icon={Add01Icon} />
								Dev: Buat flashcard
							</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={() => (quizDialogOpen = true)}>
								<HugeiconsIcon icon={Quiz01Icon} />
								Dev: Buat quiz
							</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={() => (chapterDialogOpen = true)}>
								<HugeiconsIcon icon={BookOpen01Icon} />
								Dev: Buat chapter
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<DevCreateFlashcardDialog bind:open={flashcardDialogOpen} {studySetId} />
				<DevCreateChapterDialog bind:open={chapterDialogOpen} {studySetId} />
				<DevCreateQuizDialog bind:open={quizDialogOpen} {studySetId} />
			</div>
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
					{#each data.chapters as chapter (chapter.id)}
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
