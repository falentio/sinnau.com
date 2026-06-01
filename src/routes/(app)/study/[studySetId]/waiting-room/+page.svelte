<script lang="ts">
	import { onMount } from 'svelte';

	type EventStub = {
		id: string;
		createdAt: string;
		content: {
			estimation: { estimatedCompletedAt: string };
		};
	};

	type GenerateStub = {
		status: 'PENDING' | 'COMPLETED' | 'FAILED';
	};

	let events = $state<EventStub[]>([
		{
			id: 'evt_placeholder_001',
			createdAt: new Date().toISOString(),
			content: {
				estimation: { estimatedCompletedAt: new Date().toISOString() }
			}
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
						id: `evt_placeholder_${events.length + 1}`,
						createdAt: new Date().toISOString(),
						content: {
							estimation: { estimatedCompletedAt: new Date(Date.now() + 60000).toISOString() }
						}
					}
				];
			}, 15000);
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
