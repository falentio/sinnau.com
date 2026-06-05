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
		const flashcards = Array.from({ length: submitCount }, (_, i) => ({
			front: `Flashcard depan #${i + 1}`,
			back: `Flashcard belakang #${i + 1}`
		}));
		await client.flashcard.create({ studySetId, flashcards });
	}
</script>

<DevCreateEntityDialog
	bind:open
	bind:count
	title="Buat flashcard (Dev)"
	description="Tentukan jumlah flashcard dummy yang akan dibuat untuk stub."
	max={200}
	submitLabel="Buat"
	successMessage={(n) => `${n} flashcard berhasil dibuat.`}
	fallbackError="Flashcard belum bisa dibuat. Coba lagi sebentar."
	{onSubmit}
/>
