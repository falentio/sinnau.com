<script lang="ts">
	import { ButtonGroup } from '$lib/components/ui/button-group/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { client } from '$lib/orpc';
	import type { QuizType } from '$lib/schemas/quiz.constant';
	import DevCreateEntityDialog from './dev-create-entity-dialog.svelte';

	type Props = {
		open: boolean;
		studySetId: string;
	};

	let { open = $bindable(false), studySetId }: Props = $props();

	let count = $state(10);
	let quizType = $state<QuizType>('MULTIPLE_CHOICE');

	const QUIZ_TYPE_OPTIONS = [
		{ value: 'MULTIPLE_CHOICE' as const, label: 'Pilihan Ganda' },
		{ value: 'MULTIPLE_SELECT' as const, label: 'Pilihan Banyak' },
		{ value: 'FILL_IN_THE_BLANK' as const, label: 'Isian Singkat' }
	];

	function stubOptionsForType(type: QuizType) {
		if (type === 'FILL_IN_THE_BLANK') {
			return [{ optionText: 'jawaban-stub', isCorrect: true }];
		}
		if (type === 'MULTIPLE_CHOICE') {
			return [
				{ optionText: 'Opsi A (benar)', isCorrect: true },
				{ optionText: 'Opsi B', isCorrect: false },
				{ optionText: 'Opsi C', isCorrect: false },
				{ optionText: 'Opsi D', isCorrect: false }
			];
		}
		return [
			{ optionText: 'Opsi A (benar)', isCorrect: true },
			{ optionText: 'Opsi B (benar)', isCorrect: true },
			{ optionText: 'Opsi C', isCorrect: false },
			{ optionText: 'Opsi D', isCorrect: false }
		];
	}

	async function onSubmit(submitCount: number) {
		if (!studySetId) throw new Error('Study set tidak ditemukan');
		for (let i = 1; i <= submitCount; i++) {
			// oxlint-disable-next-line no-await-in-loop -- dev-only seeding, not user-facing
			await client.quiz.create({
				studySetId,
				type: quizType,
				questionText: `Pertanyaan stub #${i}?`,
				options: stubOptionsForType(quizType)
			});
		}
	}
</script>

<DevCreateEntityDialog
	bind:open
	bind:count
	title="Buat quiz (Dev)"
	description="Tentukan jumlah quiz dummy yang akan dibuat untuk stub."
	max={100}
	submitLabel="Buat"
	successMessage={(n) => `${n} quiz berhasil dibuat.`}
	fallbackError="Quiz belum bisa dibuat. Coba lagi sebentar."
	{onSubmit}
>
	<div class="flex flex-col gap-2">
		<span class="text-sm font-medium">Tipe quiz</span>
		<ButtonGroup>
			{#each QUIZ_TYPE_OPTIONS as opt (opt.value)}
				<Button
					variant={quizType === opt.value ? 'default' : 'outline'}
					size="sm"
					onclick={() => (quizType = opt.value)}
				>
					{opt.label}
				</Button>
			{/each}
		</ButtonGroup>
	</div>
</DevCreateEntityDialog>
