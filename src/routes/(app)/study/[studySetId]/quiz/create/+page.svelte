<script lang="ts" module>
	import * as v from 'valibot';

	const optionSchema = v.object({
		optionText: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Opsi tidak boleh kosong.'),
			v.maxLength(500, 'Maksimal 500 karakter.')
		),
		isCorrect: v.boolean(),
		explanation: v.optional(v.pipe(v.string(), v.maxLength(500, 'Maksimal 500 karakter.')))
	});

	const formSchema = v.object({
		type: v.picklist(['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'FILL_IN_THE_BLANK'] as const),
		questionText: v.pipe(v.string(), v.trim(), v.nonEmpty('Soal tidak boleh kosong.')),
		options: v.array(optionSchema)
	});

	type QuizForm = v.InferOutput<typeof formSchema>;
	type QuizOptionForm = QuizForm['options'][number];
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { PlusSignIcon, DeleteIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type FormQuizType = QuizForm['type'];

	let serverError = $state('');
	let pending = $state(false);
	let showExplanation = $state(false);

	const quizTypeItems = [
		{ value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' },
		{ value: 'MULTIPLE_SELECT', label: 'Pilihan Banyak' },
		{ value: 'FILL_IN_THE_BLANK', label: 'Isian Singkat' }
	];

	function emptyOption(isCorrect = false): QuizOptionForm {
		return {
			optionText: '',
			isCorrect,
			explanation: ''
		};
	}

	function getOptionBounds(type: FormQuizType) {
		if (type === 'FILL_IN_THE_BLANK') return { min: 1, max: 1 };
		if (type === 'MULTIPLE_SELECT') return { min: 2, max: 10 };
		return { min: 2, max: 6 };
	}

	function normalizeOptions(type: FormQuizType, options: QuizOptionForm[]) {
		if (type === 'FILL_IN_THE_BLANK') {
			const option = options.find((option) => option.isCorrect) ?? options[0] ?? emptyOption();
			return [{ ...option, isCorrect: true }];
		}

		const { min, max } = getOptionBounds(type);
		const normalized = options.slice(0, max);

		while (normalized.length < min) normalized.push(emptyOption());

		if (type === 'MULTIPLE_CHOICE') {
			const correctIndex = Math.max(
				0,
				normalized.findIndex((option) => option.isCorrect)
			);
			return normalized.map((option, index) => ({ ...option, isCorrect: index === correctIndex }));
		}

		return normalized;
	}

	function getQuizType() {
		return $formData.type;
	}

	function setQuizType(type: string | undefined) {
		if (!type) return;
		const quizType = type as FormQuizType;

		$formData.type = quizType;
		$formData.options = normalizeOptions(quizType, $formData.options);
		serverError = '';
	}

	const form = superForm(
		defaults<QuizForm>(
			{
				type: 'MULTIPLE_CHOICE',
				questionText: '',
				options: [emptyOption(true), emptyOption(), emptyOption(), emptyOption()]
			},
			valibotClient(formSchema)
		),
		{
			SPA: true,
			validators: valibotClient(formSchema),
			resetForm: false,
			dataType: 'json',
			onUpdate: async ({ form: submittedForm }) => {
				serverError = '';
				if (!submittedForm.valid) return;
				await submitQuiz(submittedForm.data);
			}
		}
	);

	const { form: formData, enhance, submitting, errors } = form;
	const selectedTypeLabel = $derived(
		quizTypeItems.find((item) => item.value === $formData.type)?.label ?? 'Pilih tipe'
	);
	const optionBounds = $derived(getOptionBounds($formData.type));
	const isFillInTheBlank = $derived($formData.type === 'FILL_IN_THE_BLANK');
	const canAddOption = $derived(!isFillInTheBlank && $formData.options.length < optionBounds.max);
	const canRemoveOption = $derived(
		!isFillInTheBlank && $formData.options.length > optionBounds.min
	);

	function addOption() {
		if (!canAddOption) return;
		$formData.options = [...$formData.options, emptyOption()];
	}

	function removeOption(index: number) {
		if (!canRemoveOption) return;
		$formData.options = normalizeOptions(
			$formData.type,
			$formData.options.filter((_, i) => i !== index)
		);
	}

	function toggleCorrectOption(index: number) {
		if ($formData.type === 'MULTIPLE_SELECT') {
			const option = $formData.options[index];
			if (!option) return;
			option.isCorrect = !option.isCorrect;
			return;
		}

		$formData.options = $formData.options.map((opt, i) => ({
			...opt,
			isCorrect: i === index
		}));
	}

	function validateOptions(type: FormQuizType, options: QuizOptionForm[]) {
		const correctCount = options.filter((option) => option.isCorrect).length;

		if (type === 'MULTIPLE_CHOICE') {
			if (options.length < 2 || options.length > 6) {
				return 'Pilihan ganda harus memiliki 2-6 opsi.';
			}
			if (correctCount !== 1) return 'Pilihan ganda harus memiliki tepat satu jawaban benar.';
		}

		if (type === 'MULTIPLE_SELECT') {
			if (options.length < 2 || options.length > 10) {
				return 'Pilihan banyak harus memiliki 2-10 opsi.';
			}
			if (correctCount < 1) return 'Pilih setidaknya satu jawaban benar.';
		}

		if (type === 'FILL_IN_THE_BLANK') {
			if (options.length !== 1 || correctCount !== 1) {
				return 'Isian singkat harus memiliki tepat satu jawaban benar.';
			}
		}

		return '';
	}

	function getErrorMessage(error: unknown) {
		if (error instanceof Error && error.message) return error.message;
		return 'Quiz belum bisa dibuat. Coba lagi sebentar.';
	}

	async function submitQuiz(data: QuizForm) {
		pending = true;

		try {
			const options = normalizeOptions(data.type, data.options);
			const validationError = validateOptions(data.type, options);

			if (validationError) {
				serverError = validationError;
				return;
			}

			serverError = 'Pembuatan quiz belum tersedia. Backend belum diimplementasikan.';
			toast.error('Backend belum diimplementasikan.');

			$formData.questionText = '';
			$formData.options = normalizeOptions(data.type, [
				emptyOption(),
				emptyOption(),
				emptyOption(),
				emptyOption()
			]);

			await tick();
			const firstInput = document.querySelector(
				'input[name="questionText"]'
			) as HTMLInputElement | null;
			firstInput?.focus();
		} catch (error) {
			serverError = getErrorMessage(error);
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Buat Quiz</title>
</svelte:head>

<form method="POST" class="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6" novalidate>
	{#if serverError}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{serverError}
		</div>
	{/if}

	<Form.Field {form} name="type">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Tipe Soal</Form.Label>
				<Select.Root
					type="single"
					name="type"
					items={quizTypeItems}
					bind:value={getQuizType, setQuizType}
					disabled={$submitting || pending}
				>
					<Select.Trigger {...props} class="w-full" aria-label="Pilih tipe soal">
						<span class="min-w-0 flex-1 truncate text-left">{selectedTypeLabel}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Tipe Soal</Select.Label>
							{#each quizTypeItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="questionText">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Soal</Form.Label>
				<Textarea
					{...props}
					bind:value={$formData.questionText}
					placeholder="Tulis pertanyaan..."
					rows={3}
					disabled={$submitting || pending}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex items-center justify-between">
		<div class="text-sm leading-none font-medium">Pilihan Jawaban</div>
		{#if !isFillInTheBlank}
			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				onclick={addOption}
				disabled={$submitting || pending || !canAddOption}
			>
				<HugeiconsIcon icon={PlusSignIcon} />
			</Button>
		{/if}
	</div>

	{#each $formData.options as option, i (i)}
		<div class="flex items-start gap-3 rounded-2xl border bg-background/50 p-3">
			<div
				class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
			>
				{String.fromCharCode(65 + i)}
			</div>
			<div class="min-w-0 flex-1 space-y-2">
				<Form.Field {form} name={`options[${i}].optionText`}>
					<Form.Control>
						{#snippet children({ props })}
							{#if isFillInTheBlank}
								<Form.Label>Jawaban Benar</Form.Label>
							{/if}
							<Input
								{...props}
								bind:value={option.optionText}
								placeholder={isFillInTheBlank
									? 'Tulis jawaban yang benar...'
									: `Opsi ${String.fromCharCode(65 + i)}`}
								maxlength={500}
								disabled={$submitting || pending}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				{#if !isFillInTheBlank}
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => toggleCorrectOption(i)}
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {option.isCorrect
								? 'border-primary bg-primary/10 text-primary'
								: 'border-input text-muted-foreground hover:bg-accent'}"
							disabled={$submitting || pending}
						>
							{option.isCorrect ? '✓ Jawaban Benar' : 'Jawaban Benar'}
						</button>
						{#if canRemoveOption}
							<button
								type="button"
								onclick={() => removeOption(i)}
								class="ml-auto text-muted-foreground hover:text-destructive disabled:opacity-50"
								disabled={$submitting || pending}
							>
								<HugeiconsIcon icon={DeleteIcon} class="size-4" />
							</button>
						{/if}
					</div>
				{/if}

				{#if showExplanation}
					<Form.Field {form} name={`options[${i}].explanation`}>
						<Form.Control>
							{#snippet children({ props })}
								<Input
									{...props}
									bind:value={option.explanation}
									placeholder="Penjelasan (opsional)"
									disabled={$submitting || pending}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				{/if}
			</div>
		</div>
	{/each}

	<button
		type="button"
		onclick={() => (showExplanation = !showExplanation)}
		class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
	>
		<span>{showExplanation ? 'Sembunyikan' : 'Tampilkan'} penjelasan</span>
	</button>

	{#if $errors.options?._errors}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{$errors.options._errors}
		</div>
	{/if}

	<div class="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
		<Button
			class="w-full sm:w-auto"
			variant="outline"
			href="/home"
			disabled={$submitting || pending}
		>
			Batal
		</Button>
		<Form.Button class="w-full sm:w-auto" disabled={$submitting || pending}>
			{$submitting || pending ? 'Membuat...' : 'Buat Quiz'}
		</Form.Button>
	</div>
</form>
