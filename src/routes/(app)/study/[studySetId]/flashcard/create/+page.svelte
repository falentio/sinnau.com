<script lang="ts" module>
	import * as v from 'valibot';

	const formSchema = v.object({
		front: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Bagian depan tidak boleh kosong.'),
			v.maxLength(1000, 'Maksimal 1000 karakter.')
		),
		back: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Bagian belakang tidak boleh kosong.'),
			v.maxLength(1000, 'Maksimal 1000 karakter.')
		),
		hint: v.optional(v.pipe(v.string(), v.maxLength(500, 'Maksimal 500 karakter.'))),
		importance: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
	});

	type FlashcardForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { tick } from 'svelte';

	let serverError = $state('');
	let pending = $state(false);

	const form = superForm(
		defaults<FlashcardForm>(
			{
				front: '',
				back: '',
				hint: ''
			},
			valibotClient(formSchema)
		),
		{
			SPA: true,
			validators: valibotClient(formSchema),
			resetForm: true,
			dataType: 'json',
			onUpdate: async ({ form: submittedForm }) => {
				serverError = '';
				if (!submittedForm.valid) return;
				await submitFlashcard(submittedForm.data);
			}
		}
	);

	const { form: formData, enhance, submitting } = form;

	function getErrorMessage(error: unknown) {
		if (error instanceof Error && error.message) return error.message;
		return 'Flashcard belum bisa dibuat. Coba lagi sebentar.';
	}

	async function submitFlashcard(_data: FlashcardForm) {
		pending = true;

		try {
			serverError = 'Pembuatan flashcard belum tersedia. Backend belum diimplementasikan.';
			toast.error('Backend belum diimplementasikan.');

			await tick();
			const firstTextarea = document.querySelector(
				'textarea[name="front"]'
			) as HTMLTextAreaElement | null;
			firstTextarea?.focus();
		} catch (error) {
			serverError = getErrorMessage(error);
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Buat Flashcard</title>
</svelte:head>

<form method="POST" class="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6" novalidate>
	{#if serverError}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{serverError}
		</div>
	{/if}

	<div class="rounded-4xl bg-card p-5 text-card-foreground shadow-xs">
		<div class="mt-4 space-y-4">
			<Form.Field {form} name="front">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Depan</Form.Label>
						<Textarea
							{...props}
							bind:value={$formData.front}
							placeholder="Pertanyaan atau istilah"
							rows={2}
							disabled={$submitting || pending}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="back">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Belakang</Form.Label>
						<Textarea
							{...props}
							bind:value={$formData.back}
							placeholder="Jawaban atau definisi"
							rows={2}
							disabled={$submitting || pending}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="hint">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Petunjuk (opsional)</Form.Label>
						<Input
							{...props}
							bind:value={$formData.hint}
							placeholder="Bantuan kecil untuk mengingat"
							disabled={$submitting || pending}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>

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
			{$submitting || pending ? 'Membuat...' : 'Buat Flashcard'}
		</Form.Button>
	</div>
</form>
