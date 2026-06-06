<script lang="ts">
	import UserAvatar from '$lib/components/features/users/user-avatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import InputGroupAddon from '$lib/components/ui/input-group/input-group-addon.svelte';
	import InputGroupButton from '$lib/components/ui/input-group/input-group-button.svelte';
	import InputGroupInput from '$lib/components/ui/input-group/input-group-input.svelte';
	import InputGroup from '$lib/components/ui/input-group/input-group.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { getUser } from '$lib/hooks/auth.svelte';
	import {
		Cancel01Icon,
		Settings02Icon,
		Search02Icon,
		AiBeautifyIcon,
		QuillWrite01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	const { children } = $props();

	const search = $state('');

	const user = getUser;
</script>

<div data-showbottombar="true"></div>

<div class="sticky top-0 z-20 bg-card text-card-foreground shadow-sm">
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
		<div class="flex items-start gap-4">
			<UserAvatar name={user()?.name ?? ''} userId={user()?.id ?? ''} class="size-12" />
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

{@render children()}
