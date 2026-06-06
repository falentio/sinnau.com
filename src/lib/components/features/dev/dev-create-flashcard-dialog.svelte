<script lang="ts">
	import { client } from '$lib/orpc';
	import DevCreateEntityDialog from './dev-create-entity-dialog.svelte';

	interface Props {
		open: boolean;
		studySetId: string;
	}

	const { open = $bindable(false), studySetId }: Props = $props();

	const count = $state(10);

	const onSubmit = async (submitCount: number) => {
		if (!studySetId) {throw new Error('Study set tidak ditemukan');}
		const flashcards = Array.from({ length: submitCount }, (_, i) => ({
			back: `Flashcard belakang #${i + 1}`,
			front: `Flashcard depan #${i + 1}`
		}));
		await client.flashcard.create({ flashcards, studySetId });
	};
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
