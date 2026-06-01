<script lang="ts" module>
	import * as v from 'valibot';

	const formSchema = v.object({
		title: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(5, 'Judul minimal 5 karakter.'),
			v.maxLength(50, 'Judul maksimal 50 karakter.')
		),
		description: v.pipe(v.string(), v.maxLength(2000, 'Deskripsi maksimal 2000 karakter.')),
		visibility: v.picklist(['PRIVATE', 'PUBLIC'] as const)
	});

	type StudySetForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';

	type Visibility = 'PUBLIC' | 'PRIVATE';

	const visibilityItems: { value: Visibility; label: string }[] = [
		{ value: 'PRIVATE', label: 'Privat' },
		{ value: 'PUBLIC', label: 'Publik' }
	];

	let serverError = $state('');
	let pending = $state(false);

	const form = superForm(
		defaults<StudySetForm>(
			{
				title: '',
				description: '',
				visibility: 'PRIVATE'
			},
			valibotClient(formSchema)
		),
		{
			SPA: true,
			validators: valibotClient(formSchema),
			resetForm: false,
			onUpdate: async ({ form: submittedForm }) => {
				serverError = '';
				if (!submittedForm.valid) return;
				await submitStudySet(submittedForm.data);
			}
		}
	);

	const { form: formData, enhance, submitting } = form;
	const selectedVisibilityLabel = $derived(
		visibilityItems.find((item) => item.value === $formData.visibility)?.label ??
			'Pilih visibilitas'
	);
	const titleCount = $derived($formData.title.trim().length);
	const descriptionCount = $derived($formData.description.length);

	function getErrorMessage(error: unknown) {
		if (error instanceof Error && error.message) return error.message;
		return 'Modul belajar belum bisa dibuat. Coba lagi sebentar.';
	}

	async function submitStudySet(_data: StudySetForm) {
		pending = true;

		try {
			serverError = 'Pembuatan modul belum tersedia. Backend belum diimplementasikan.';
			toast.error('Backend belum diimplementasikan.');
		} catch (error) {
			serverError = getErrorMessage(error);
		} finally {
			pending = false;
		}
	}
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
	class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-6 py-6"
	novalidate
>
	{#if serverError}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{serverError}
		</div>
	{/if}

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
					disabled={$submitting || pending}
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
					disabled={$submitting || pending}
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
					disabled={$submitting || pending}
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
		<Button
			class="w-full sm:w-auto"
			variant="outline"
			href="/home"
			disabled={$submitting || pending}
		>
			Batal
		</Button>
		<Form.Button class="w-full sm:w-auto" disabled={$submitting || pending}>
			{$submitting || pending ? 'Membuat...' : 'Buat Modul'}
		</Form.Button>
	</div>
</form>
