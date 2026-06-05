<script lang="ts">
	import { client } from '$lib/orpc';
	import DevCreateEntityDialog from './dev-create-entity-dialog.svelte';

	type Props = {
		open: boolean;
		studySetId: string;
	};

	let { open = $bindable(false), studySetId }: Props = $props();

	let count = $state(10);

	async function onSubmit(submitCount: number) {
		if (!studySetId) throw new Error('Study set tidak ditemukan');
		for (let i = 1; i <= submitCount; i++) {
			await client.chapter.create({
				studySetId,
				title: `Bab stub ${i}`,
				description: `Chapter dev stub #${i}`
			});
		}
	}
</script>

<DevCreateEntityDialog
	bind:open
	bind:count
	title="Buat chapter (Dev)"
	description="Tentukan jumlah chapter dummy yang akan dibuat untuk stub."
	max={50}
	submitLabel="Buat"
	successMessage={(n) => `${n} chapter berhasil dibuat.`}
	fallbackError="Chapter belum bisa dibuat. Coba lagi sebentar."
	{onSubmit}
/>
