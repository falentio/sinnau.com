<script lang="ts" module>
	import * as v from 'valibot';

	const formSchema = v.object({
		files: v.array(v.instance(File)),
		instructions: v.pipe(v.string(), v.maxLength(1000, 'Maksimal 1000 karakter.'))
	});

	type GenerateForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowLeft01Icon,
		ArrowDown01Icon,
		ArrowUp01Icon,
		FileUploadIcon,
		DeleteIcon
	} from '@hugeicons/core-free-icons';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let serverError = $state('');
	let pending = $state(false);
	let advancedMode = $state(false);
	let selectedFiles = $state<File[]>([]);

	const form = superForm(
		defaults<GenerateForm>(
			{
				files: [],
				instructions: ''
			},
			valibotClient(formSchema)
		),
		{
			SPA: true,
			validators: valibotClient(formSchema),
			resetForm: false
		}
	);

	const { form: formData, enhance, submitting } = form;
	const instructionsCount = $derived($formData.instructions.length);
</script>

<svelte:head>
	<title>Buat Modul dengan AI</title>
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

	<Form.Field {form} name="files">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>File</Form.Label>
				<div class="flex flex-col gap-3">
					<Input
						{...props}
						type="file"
						accept=".pdf,.docx"
						class="hidden"
						id="file-input"
						multiple
						disabled={$submitting || pending}
						onchange={(e) => {
							const input = e.currentTarget as HTMLInputElement;
							if (input.files) {
								selectedFiles = [...selectedFiles, ...Array.from(input.files)];
							}
						}}
					/>
					<label
						for="file-input"
						class="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border border-input bg-background px-4 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
					>
						<HugeiconsIcon icon={FileUploadIcon} />
						<span>Pilih file</span>
					</label>
					{#if selectedFiles.length > 0}
						<ul class="flex flex-col gap-2">
							{#each selectedFiles as file, index (file.name + index)}
								<li class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
									<span class="truncate">{file.name}</span>
									<button
										type="button"
										onclick={() => {
											selectedFiles = selectedFiles.filter((_, i) => i !== index);
										}}
										class="text-muted-foreground hover:text-destructive"
									>
										<HugeiconsIcon icon={DeleteIcon} class="size-4" />
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/snippet}
		</Form.Control>
		<Form.Description>Unggah materi dalam format PDF atau DOCX.</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<button
		type="button"
		onclick={() => (advancedMode = !advancedMode)}
		class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
	>
		<HugeiconsIcon icon={advancedMode ? ArrowUp01Icon : ArrowDown01Icon} />
		<span>Mode Lanjutan</span>
	</button>

	{#if advancedMode}
		<Form.Field {form} name="instructions">
			<Form.Control>
				{#snippet children({ props })}
					<div class="flex items-center justify-between gap-3">
						<Form.Label>Instruksi Tambahan</Form.Label>
						<span class="text-xs text-muted-foreground">{instructionsCount}/1000</span>
					</div>
					<Textarea
						{...props}
						bind:value={$formData.instructions}
						placeholder="Tambahkan instruksi khusus untuk AI..."
						disabled={$submitting || pending}
					/>
				{/snippet}
			</Form.Control>
			<Form.Description
				>Opsional. Berikan instruksi spesifik untuk menghasilkan konten yang diinginkan.</Form.Description
			>
			<Form.FieldErrors />
		</Form.Field>
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
			{$submitting || pending ? 'Membuat...' : 'Hasilkan Modul'}
		</Form.Button>
	</div>
</form>
