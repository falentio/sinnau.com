<script lang="ts">
	import { onMount } from 'svelte';

	interface EventStub {
		id: string;
		createdAt: string;
		content: {
			estimation: { estimatedCompletedAt: string };
		};
	}

	interface GenerateStub {
		status: 'PENDING' | 'COMPLETED' | 'FAILED';
	}

	let events = $state<EventStub[]>([
		{
			content: {
				estimation: { estimatedCompletedAt: new Date().toISOString() }
			},
			createdAt: new Date().toISOString(),
			id: 'evt_placeholder_001'
		}
	]);

	const generate: GenerateStub = { status: 'PENDING' };

	const lastResult = $derived({ data: { generate } });
	const done = $derived(lastResult?.data.generate.status === 'COMPLETED');

	if (typeof window !== 'undefined') {
		onMount(() => {
			const interval = setInterval(() => {
				events = [
					...events,
					{
						content: {
							estimation: { estimatedCompletedAt: new Date(Date.now() + 60_000).toISOString() }
						},
						createdAt: new Date().toISOString(),
						id: `evt_placeholder_${events.length + 1}`
					}
				];
			}, 15_000);
			return () => clearInterval(interval);
		});
	}
</script>

<div class="p-6">
	<h1 class="text-lg font-semibold">Menunggu modul dibuat...</h1>
	<p class="mt-2 text-sm text-muted-foreground">
		Backend belum diimplementasikan. Halaman ini menunggu proses generate AI secara real-time.
	</p>

	<div class="mt-4 rounded-2xl bg-card p-4 text-card-foreground shadow-xs">
		<p class="text-sm">Estimasi selesai:</p>
		<p class="font-medium">
			{new Date(events.at(1)?.content.estimation.estimatedCompletedAt || 0).toLocaleString()}
		</p>
	</div>

	<pre class="mt-4 overflow-x-auto rounded-2xl bg-muted p-4 text-xs">
{JSON.stringify(events, null, 2)}
	</pre>
</div>
