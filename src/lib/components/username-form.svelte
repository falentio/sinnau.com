<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Label from '$lib/components/ui/label/index.js';

	let username = $state('');
	let pending = $state(false);
	let error = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = 'Pemilihan username belum tersedia. Backend belum diimplementasikan.';
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
	{#if error}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<div class="grid gap-2">
		<Label.Root for="username">Username</Label.Root>
		<Input id="username" type="text" placeholder="username" required bind:value={username} />
	</div>

	<Button type="submit" class="w-full" disabled={pending}>
		{pending ? 'Menyimpan...' : 'Simpan'}
	</Button>
</form>
