<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Label from '$lib/components/ui/label/index.js';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let pending = $state(false);
	let error = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = 'Pendaftaran belum tersedia. Backend belum diimplementasikan.';
	}
</script>

<form class="flex flex-col gap-6" onsubmit={handleSubmit}>
	<div class="flex flex-col gap-2 text-center">
		<h1 class="text-2xl font-semibold tracking-tight">Daftar</h1>
		<p class="text-sm text-muted-foreground">Buat akun untuk mulai belajar</p>
	</div>

	{#if error}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<div class="grid gap-2">
		<Label.Root for="name">Nama</Label.Root>
		<Input id="name" type="text" required bind:value={name} />
	</div>

	<div class="grid gap-2">
		<Label.Root for="email">Email</Label.Root>
		<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
	</div>

	<div class="grid gap-2">
		<Label.Root for="password">Kata Sandi</Label.Root>
		<Input id="password" type="password" required bind:value={password} />
	</div>

	<Button type="submit" class="w-full" disabled={pending}>
		{pending ? 'Memproses...' : 'Daftar'}
	</Button>

	<div class="text-center text-sm">
		Sudah punya akun?
		<a href="/login" class="underline underline-offset-4">Masuk</a>
	</div>
</form>
