<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Label from '$lib/components/ui/label/index.js';

	let email = $state('');
	let password = $state('');
	let pending = $state(false);
	let error = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = 'Login belum tersedia. Backend belum diimplementasikan.';
	}
</script>

<form class="flex flex-col gap-6" onsubmit={handleSubmit}>
	<div class="flex flex-col gap-2 text-center">
		<h1 class="text-2xl font-semibold tracking-tight">Masuk</h1>
		<p class="text-sm text-muted-foreground">Masukkan email untuk masuk ke akun Anda</p>
	</div>

	{#if error}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<div class="grid gap-2">
		<Label.Root for="email">Email</Label.Root>
		<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
	</div>

	<div class="grid gap-2">
		<Label.Root for="password">Kata Sandi</Label.Root>
		<Input id="password" type="password" required bind:value={password} />
	</div>

	<Button type="submit" class="w-full" disabled={pending}>
		{pending ? 'Memproses...' : 'Masuk'}
	</Button>

	<div class="text-center text-sm">
		Belum punya akun?
		<a href="/sign-up" class="underline underline-offset-4">Daftar</a>
	</div>
</form>
