<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { client } from '$lib/orpc';
	import {
		FLASHCARD_HINT_MAX_LENGTH,
		FLASHCARD_TEXT_MAX_LENGTH,
		hintSchema,
		importanceSchema,
		trimmedTextSchema
	} from '$lib/schemas/flashcard';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ORPCError } from '@orpc/client';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import * as v from 'valibot';

	const formSchema = v.object({
		front: trimmedTextSchema,
		back: trimmedTextSchema,
		hint: hintSchema,
		importance: importanceSchema
	});

	type FlashcardForm = v.InferOutput<typeof formSchema>;

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
			onUpdate: async ({ form: submittedForm }) => {
				if (!submittedForm.valid) return;
				await submitFlashcard(submittedForm.data);
			}
		}
	);

	const { form: formData, enhance, submitting } = form;

	const studySetId = $derived(page.params.studySetId ?? '');
	const flashcardListHref = $derived(
		resolve('/(app)/study/[studySetId]/flashcard', { studySetId })
	);
	const frontCount = $derived(($formData.front ?? '').trim().length);
	const backCount = $derived(($formData.back ?? '').trim().length);
	const hintCount = $derived(($formData.hint ?? '').length);

	async function submitFlashcard(data: FlashcardForm) {
		try {
			await client.flashcard.create({
				studySetId,
				flashcards: [data]
			});
			toast.success('Flashcard berhasil dibuat.', { position: 'top-right' });
			await goto(flashcardListHref);
		} catch (error) {
			if (error instanceof ORPCError) {
				if (error.code === 'UNAUTHORIZED') {
					await goto(resolve('/(auth)/login'));
					return;
				}
				toast.error(error.message, { position: 'top-right' });
			} else if (error instanceof Error) {
				toast.error(error.message, { position: 'top-right' });
			} else {
				toast.error('Flashcard belum bisa dibuat. Coba lagi sebentar.', {
					position: 'top-right'
				});
			}
		}
	}
</script>

<svelte:head>
	<title>Buat Flashcard</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-3">
	<Button variant="ghost" href={flashcardListHref}>
		<HugeiconsIcon icon={ArrowLeft01Icon} />
		Kembali</Button
	>
</div>

<form
	class="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5 px-6 py-6"
	novalidate
	use:enhance
>
	<div class="rounded-4xl bg-card p-5 text-card-foreground shadow-xs">
		<div class="mt-4 space-y-4">
			<Form.Field {form} name="front">
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center justify-between gap-3">
							<Form.Label>Depan</Form.Label>
							<span class="text-xs text-muted-foreground"
								>{frontCount}/{FLASHCARD_TEXT_MAX_LENGTH}</span
							>
						</div>
						<Textarea
							{...props}
							bind:value={$formData.front}
							placeholder="Pertanyaan atau istilah"
							rows={2}
							disabled={$submitting}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>Bagian depan ditampilkan sebagai pertanyaan.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="back">
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center justify-between gap-3">
							<Form.Label>Belakang</Form.Label>
							<span class="text-xs text-muted-foreground"
								>{backCount}/{FLASHCARD_TEXT_MAX_LENGTH}</span
							>
						</div>
						<Textarea
							{...props}
							bind:value={$formData.back}
							placeholder="Jawaban atau definisi"
							rows={2}
							disabled={$submitting}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>Bagian belakang ditampilkan sebagai jawaban.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="hint">
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center justify-between gap-3">
							<Form.Label>Petunjuk (opsional)</Form.Label>
							<span class="text-xs text-muted-foreground"
								>{hintCount}/{FLASHCARD_HINT_MAX_LENGTH}</span
							>
						</div>
						<Input
							{...props}
							bind:value={$formData.hint}
							placeholder="Bantuan kecil untuk mengingat"
							disabled={$submitting}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>Opsional, tapi membantu saat belajar.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>

	<div class="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
		<Button
			class="w-full sm:w-auto"
			variant="outline"
			href={flashcardListHref}
			disabled={$submitting}
		>
			Batal
		</Button>
		<Form.Button class="w-full sm:w-auto" disabled={$submitting}>
			{$submitting ? 'Membuat...' : 'Buat Flashcard'}
		</Form.Button>
	</div>
</form>
