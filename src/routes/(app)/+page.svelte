<script lang="ts">
	import { client } from '$lib/orpc';

	let result = $state<{ message: string; timestamp: number } | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function ping() {
		loading = true;
		error = null;
		try {
			result = await client.ping();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	}
</script>

<h1>Selamat Datang di Sinnau</h1>
<p class="p-6 text-muted-foreground">Modul belajar Anda akan muncul di sini.</p>
<div>hello world</div>
<div class="mt-8 space-y-4">
	<button
		onclick={ping}
		disabled={loading}
		class="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
	>
		{loading ? 'Pinging...' : 'Ping oRPC'}
	</button>

	{#if result}
		<pre class="rounded-lg bg-muted p-4 text-sm">{JSON.stringify(result, null, 2)}</pre>
	{/if}

	{#if error}
		<p class="text-destructive">{error}</p>
	{/if}
</div>
