<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardFooter from '$lib/components/ui/card/card-footer.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import Card from '$lib/components/ui/card/card.svelte';

	type PlanKey = 'FREE' | 'PRO' | 'PREMIUM';

	const plans: { key: PlanKey; description: string; price: string; features: string[] }[] = [
		{
			key: 'FREE',
			description: 'Paket gratis untuk mencoba.',
			price: '0',
			features: ['10 generate per hari', '3 modul belajar', 'Flashcard dasar']
		},
		{
			key: 'PRO',
			description: 'Untuk pelajar aktif.',
			price: '49',
			features: [
				'100 generate per hari',
				'Modul tidak terbatas',
				'Quiz otomatis',
				'Statistik belajar'
			]
		},
		{
			key: 'PREMIUM',
			description: 'Untuk semua kebutuhan belajar.',
			price: '99',
			features: ['Generate tidak terbatas', 'AI tutor personal', 'Ekspor PDF', 'Dukungan prioritas']
		}
	];
</script>

<div class="my-3">
	<h1 class="text-lg font-medium">Harga subskripsi</h1>
</div>

<div class="flex flex-col gap-3">
	{#each plans as plan (plan.key)}
		<Card>
			<CardHeader>
				<CardTitle>{plan.key}</CardTitle>
				<CardDescription>{plan.description}</CardDescription>
			</CardHeader>
			<CardContent>
				<ul class="list-disc space-y-1 pl-5 text-sm">
					{#each plan.features as feature}
						<li>{feature}</li>
					{/each}
				</ul>
			</CardContent>
			<CardFooter class="justify-end">
				<Button variant={plan.key === 'FREE' ? 'outline' : 'default'}>
					{plan.key === 'FREE' ? 'Gratis' : `Beli - ${plan.price}k`}
				</Button>
			</CardFooter>
		</Card>
	{/each}
</div>
