<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { client } from '$lib/orpc';
	import type { CreateStudySetInput } from '$lib/schemas/study-set';
	import { createStudySetInputSchema } from '$lib/schemas/study-set';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ORPCError } from '@orpc/client';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type Visibility = 'PUBLIC' | 'PRIVATE';

	const visibilityItems: { value: Visibility; label: string }[] = [
		{ label: 'Privat', value: 'PRIVATE' },
		{ label: 'Publik', value: 'PUBLIC' }
	];

	const submitStudySet = async (data: CreateStudySetInput) => {
		try {
			const studySet = await client.studySet.create(data);
			toast.success('Modul belajar berhasil dibuat.', { position: 'top-right' });
			await goto(resolve('/(app)/study/[studySetId]/flashcard', { studySetId: studySet.id }));
		} catch (error) {
			if (error instanceof ORPCError) {
				if (error.code === 'UNAUTHORIZED') {
					await goto(resolve('/(auth)/login'));
					return;
				}
				if (error.code === 'STUDY_SET_SLUG_CONFLICT') {
					toast.error('Gagal membuat tautan unik. Coba lagi dengan judul berbeda.', {
						position: 'top-right'
					});
					return;
				}
				toast.error(error.message, { position: 'top-right' });
			} else if (error instanceof Error) {
				toast.error(error.message, { position: 'top-right' });
			} else {
				toast.error('Modul belajar belum bisa dibuat. Coba lagi sebentar.', {
					position: 'top-right'
				});
			}
		}
	}

	const form = superForm(
		defaults<CreateStudySetInput>(
			{
				description: '',
				title: '',
				visibility: 'PRIVATE'
			},
			valibotClient(createStudySetInputSchema)
		),
		{
			SPA: true,
			onUpdate: async ({ form: submittedForm }) => {
				if (!submittedForm.valid) {return;}
				await submitStudySet(submittedForm.data);
			},
			resetForm: false,
			validators: valibotClient(createStudySetInputSchema)
		}
	);

	const { form: formData, enhance, submitting } = form;
	const selectedVisibilityLabel = $derived(
		visibilityItems.find((item) => item.value === $formData.visibility)?.label ??
			'Pilih visibilitas'
	);
	const titleCount = $derived($formData.title.trim().length);
	const descriptionCount = $derived(($formData.description ?? '').length);
</script>

<svelte:head>
	<title>Buat Modul Belajar</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-3">
	<Button variant="ghost" href="/home">
		<HugeiconsIcon icon={ArrowLeft01Icon} />
		Kembali</Button
	>
</div>

<form
	method="POST"
	class="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5 px-6 py-6"
	novalidate
	use:enhance
>
	<Form.Field {form} name="title">
		<Form.Control>
			{#snippet children({ props })}
				<div class="flex items-center justify-between gap-3">
					<Form.Label>Judul</Form.Label>
					<span class="text-xs text-muted-foreground">{titleCount}/50</span>
				</div>
				<Input
					{...props}
					bind:value={$formData.title}
					placeholder="Contoh: Aljabar Linear Dasar"
					disabled={$submitting}
				/>
			{/snippet}
		</Form.Control>
		<Form.Description>Gunakan judul yang mudah dikenali.</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="description">
		<Form.Control>
			{#snippet children({ props })}
				<div class="flex items-center justify-between gap-3">
					<Form.Label>Deskripsi</Form.Label>
					<span class="text-xs text-muted-foreground">{descriptionCount}/2000</span>
				</div>
				<Textarea
					{...props}
					bind:value={$formData.description}
					placeholder="Ringkas isi modul, tujuan belajar, atau topik yang akan dibahas."
					disabled={$submitting}
				/>
			{/snippet}
		</Form.Control>
		<Form.Description>Opsional, tapi membantu memberi konteks.</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="visibility">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Visibilitas</Form.Label>
				<Select.Root
					type="single"
					name="visibility"
					items={visibilityItems}
					bind:value={$formData.visibility}
					disabled={$submitting}
				>
					<Select.Trigger {...props} class="w-full" aria-label="Pilih visibilitas">
						<span class="min-w-0 flex-1 truncate text-left">{selectedVisibilityLabel}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Visibilitas</Select.Label>
							{#each visibilityItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.Description
			>Privat hanya untukmu, publik bisa diakses lewat tautan langsung.</Form.Description
		>
		<Form.FieldErrors />
	</Form.Field>

	<div class="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
		<Button class="w-full sm:w-auto" variant="outline" href="/home" disabled={$submitting}>
			Batal
		</Button>
		<Form.Button class="w-full sm:w-auto" disabled={$submitting}>
			{$submitting ? 'Membuat...' : 'Buat Modul'}
		</Form.Button>
	</div>
</form>
