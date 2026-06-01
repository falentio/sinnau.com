<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardFooter from '$lib/components/ui/card/card-footer.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	const relativeTimeFormatter = new Intl.RelativeTimeFormat('id-ID', {
		numeric: 'auto',
		style: 'long'
	});

	function remainingPercentage(remaining: number, limit: number) {
		if (limit <= 0) return 0;
		return Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
	}

	function formatTimeUntilReset(resetAt: Date | string) {
		const remainingMs = new Date(resetAt).getTime() - Date.now();
		const minute = 60 * 1000;
		const hour = 60 * minute;
		const day = 24 * hour;
		const remaining = Math.max(remainingMs, 0);

		if (remaining >= day) return relativeTimeFormatter.format(Math.ceil(remaining / day), 'day');
		if (remaining >= hour) return relativeTimeFormatter.format(Math.ceil(remaining / hour), 'hour');
		if (remaining >= minute)
			return relativeTimeFormatter.format(Math.ceil(remaining / minute), 'minute');

		return relativeTimeFormatter.format(0, 'second');
	}

	const limitStatus = {
		planKey: 'FREE' as const,
		daily: { remaining: 7, limit: 10, resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
		weekly: { remaining: 50, limit: 70, resetAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
	};

	const usageLimits = [
		{ key: 'daily', label: 'Harian', ...limitStatus.daily },
		{ key: 'weekly', label: 'Mingguan', ...limitStatus.weekly }
	];
</script>

<div class="my-3">
	<h1 class="text-lg font-medium">Penggunaan subskripsi</h1>
</div>

<Card>
	<CardHeader>
		<CardTitle>{limitStatus.planKey}</CardTitle>
		<CardDescription>
			{#if limitStatus.planKey === 'FREE'}
				Upgrade untuk mendapatkan kuota pembuatan konten yang lebih besar.
			{:else}
				Pantau sisa kuota pembuatan konten dari paket aktif Anda.
			{/if}
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-4">
		{#each usageLimits as usage, index (usage.key)}
			{@const remainingQuotaPercentage = remainingPercentage(usage.remaining, usage.limit)}
			{#if index > 0}
				<Separator />
			{/if}

			<div class="space-y-2">
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm font-medium">{usage.label}</p>
					<p class="text-right text-sm text-muted-foreground">
						<span class="font-medium text-card-foreground">{remainingQuotaPercentage}%</span> •
						reset {formatTimeUntilReset(usage.resetAt)}
					</p>
				</div>
				<Progress
					value={remainingQuotaPercentage}
					max={100}
					aria-label={`${usage.label} ${remainingQuotaPercentage}% tersisa`}
				/>
			</div>
		{/each}
	</CardContent>
	{#if limitStatus.planKey === 'FREE'}
		<CardFooter class="justify-end">
			<Button href="/subs/pricing">Upgrade Paket</Button>
		</CardFooter>
	{/if}
</Card>
