<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		File01Icon,
		Cancel01Icon,
		Settings02Icon,
		Search02Icon,
		AiBeautifyIcon,
		Book03Icon,
		QuillWrite01Icon
	} from '@hugeicons/core-free-icons';
	import Button from '$lib/components/ui/button/button.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import InputGroup from '$lib/components/ui/input-group/input-group.svelte';
	import InputGroupButton from '$lib/components/ui/input-group/input-group-button.svelte';
	import InputGroupAddon from '$lib/components/ui/input-group/input-group-addon.svelte';
	import InputGroupInput from '$lib/components/ui/input-group/input-group-input.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import Empty from '$lib/components/ui/empty/empty.svelte';
	import EmptyMedia from '$lib/components/ui/empty/empty-media.svelte';
	import EmptyHeader from '$lib/components/ui/empty/empty-header.svelte';
	import EmptyTitle from '$lib/components/ui/empty/empty-title.svelte';
	import EmptyDescription from '$lib/components/ui/empty/empty-description.svelte';
	import EmptyContent from '$lib/components/ui/empty/empty-content.svelte';
	import { getUser } from '$lib/hooks/auth.svelte';

	let search = $state('');

	type StudySetStub = {
		id: string;
		title: string;
		description: string;
	};

	const studySets: StudySetStub[] = [
		{
			id: 'sst_placeholder_001',
			title: 'Aljabar Linear',
			description: 'Vektor, matriks, dan transformasi linear.'
		},
		{
			id: 'sst_placeholder_002',
			title: 'Kalkulus Dasar',
			description: 'Limit, turunan, dan integral.'
		},
		{
			id: 'sst_placeholder_003',
			title: 'Fisika Modern',
			description: 'Relativitas khusus dan mekanika kuantum.'
		}
	];

	const user = getUser;
</script>

<div class="sticky top-0 z-20 bg-card text-card-foreground shadow-sm">
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
		<div class="flex items-start gap-4">
			<Avatar class="size-12">
				<AvatarImage src="" />
				<AvatarFallback>
					{user()
						?.name?.split(' ')
						.map((n) => n[0])
						.join('')
						.slice(0, 2) ?? 'U'}
				</AvatarFallback>
			</Avatar>
			<div class="">
				<span class="text-xs text-muted-foreground">Selamat belajar!</span>
				<h2 class=" leading-tight font-semibold">{user()?.name ?? 'Pengguna'}</h2>
			</div>
			<span class="flex-auto"></span>
			<div class="self-center">
				<Button size="icon" variant="ghost">
					<HugeiconsIcon icon={Settings02Icon} />
				</Button>
			</div>
		</div>
		<InputGroup>
			<InputGroupInput bind:value={search} placeholder="Cari di modul pembelajaran..." />
			<InputGroupAddon align="inline-start">
				<HugeiconsIcon icon={Search02Icon} />
			</InputGroupAddon>
			{#if search}
				<InputGroupButton onclick={() => (search = '')}>
					<HugeiconsIcon icon={Cancel01Icon} />
				</InputGroupButton>
			{/if}
		</InputGroup>

		<ScrollArea class="w-full  rounded-2xl " orientation="horizontal">
			<div class="flex flex-nowrap gap-3">
				<Button href="/study/generate">
					<HugeiconsIcon icon={AiBeautifyIcon} />
					Buat dengan AI
				</Button>
				<Button variant="outline" href="/study/new">
					<HugeiconsIcon icon={QuillWrite01Icon} />
					Buat manual
				</Button>
			</div>
		</ScrollArea>
	</div>
</div>

<div>
	<div class="mx-auto flex w-full max-w-2xl flex-col px-6">
		<div class="mt-4 mb-2 flex items-center justify-between">
			<h2 class="text-sm font-medium">Modul Belajar Sebelumnya</h2>
			<Button variant="link" href="/study/history">Lihat Semua</Button>
		</div>

		<ScrollArea class="w-full overflow-y-visible" orientation="horizontal">
			<div class="flex flex-nowrap gap-3">
				{#each Array.from({ length: 8 }) as _, i (i)}
					<div
						class="flex max-w-xs flex-col gap-2 rounded-2xl bg-card p-3 text-card-foreground shadow-xs"
					>
						<div>
							<div class="w-min rounded-lg bg-primary/10 p-2">
								<HugeiconsIcon icon={Book03Icon} />
							</div>
						</div>
						<div class="flex flex-col gap-1">
							<h3 class="w-max max-w-full truncate">Modul Placeholder #{i + 1}</h3>
							<div class="text-xs text-muted-foreground">Dikunjungi baru-baru ini</div>
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
		<div class="mt-4 mb-2 flex items-center justify-between">
			<h2 class="text-sm font-medium">Flashcard Menunggumu</h2>
			<Button variant="link" href="/study/flashcards">Lihat Semua</Button>
		</div>

		<ScrollArea class="w-full overflow-y-visible" orientation="horizontal">
			<div class="flex flex-nowrap gap-3">
				{#each Array.from({ length: 8 }) as _, i (i)}
					<div
						class="flex max-w-xs flex-col gap-2 rounded-2xl bg-card p-3 text-card-foreground shadow-xs"
					>
						<div>
							<div class="w-min rounded-lg bg-primary/10 p-2">
								<HugeiconsIcon icon={Book03Icon} />
							</div>
						</div>
						<div class="flex flex-col gap-1">
							<h3 class="w-max max-w-full truncate">Set Flashcard #{i + 1}</h3>
							<div class="text-xs text-muted-foreground">Menunggu untuk dipelajari</div>
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
		<div class="mt-4 mb-2 flex items-center justify-between">
			<h2 class="text-sm font-medium">Semua Modul</h2>
			<Button variant="link" href="/study/generate">
				<HugeiconsIcon icon={AiBeautifyIcon} />
				Buat Dengan AI
			</Button>
		</div>
		{#if studySets.length === 0}
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<HugeiconsIcon icon={File01Icon} />
					</EmptyMedia>
					<EmptyTitle>Belum ada modul belajar</EmptyTitle>
					<EmptyDescription>
						Kamu belum memiliki modul belajar, kami memiliki fitur generate menggunakan AI yang bisa
						membantumu.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<div class="flex gap-2">
						<Button size="sm" variant="outline" href="/study/new">
							<HugeiconsIcon icon={QuillWrite01Icon} />
							Buat manual
						</Button>
						<Button size="sm" href="/study/generate">
							<HugeiconsIcon icon={AiBeautifyIcon} />
							Buat dengan AI
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		{:else}
			<div class="flex flex-col gap-3">
				{#each studySets as studySet (studySet.id)}
					<a
						href="/study/{studySet.id}/flashcard"
						class="flex w-full flex-col gap-2 rounded-2xl bg-card p-3 text-card-foreground shadow-xs"
					>
						<div>
							<div class="w-min rounded-lg bg-primary/10 p-2">
								<HugeiconsIcon icon={Book03Icon} />
							</div>
						</div>
						<div class="flex flex-col gap-1">
							<h3 class="w-max max-w-full truncate">
								{studySet.title}
							</h3>
							<div class="max-w-full truncate text-xs text-muted-foreground">
								{studySet.description}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
