<script lang="ts" module>
	import * as v from 'valibot';

	const formSchema = v.pipe(
		v.object({
			name: v.pipe(
				v.string(),
				v.trim(),
				v.minLength(1, 'Nama wajib diisi.'),
				v.maxLength(64, 'Nama maksimal 64 karakter.')
			),
			email: v.pipe(
				v.string(),
				v.trim(),
				v.email('Email tidak valid.'),
				v.maxLength(255, 'Email maksimal 255 karakter.')
			),
			password: v.pipe(
				v.string(),
				v.minLength(8, 'Kata sandi minimal 8 karakter.'),
				v.maxLength(128, 'Kata sandi maksimal 128 karakter.')
			),
			confirmPassword: v.pipe(v.string(), v.minLength(1, 'Konfirmasi kata sandi wajib diisi.'))
		}),
		v.forward(
			v.partialCheck(
				[['password'], ['confirmPassword']],
				(input) => input.password === input.confirmPassword,
				'Konfirmasi kata sandi tidak cocok.'
			),
			['confirmPassword']
		)
	);

	type SignUpForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Form from '$lib/components/ui/form/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import { authClient } from '$lib/hooks/auth.svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let serverError = $state('');
	let pending = $state(false);

	function getErrorMessage(error: { message?: string } | null | undefined) {
		if (error?.message) return error.message;
		return 'Tidak bisa mendaftar. Coba lagi sebentar.';
	}

	async function signUp(data: SignUpForm) {
		pending = true;
		try {
			const { error } = await authClient.signUp.email({
				name: data.name,
				email: data.email,
				password: data.password
			});
			if (error) {
				serverError = getErrorMessage(error);
				return;
			}
			await goto(resolve('/(app)/home'));
		} catch (error) {
			serverError = getErrorMessage(error as { message?: string });
		} finally {
			pending = false;
		}
	}

	const form = superForm(
		defaults<SignUpForm>(
			{
				name: '',
				email: '',
				password: '',
				confirmPassword: ''
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
				await signUp(submittedForm.data);
			}
		}
	);

	const { form: formData, enhance, submitting } = form;
</script>

<form class="flex flex-col gap-6" method="POST" use:enhance novalidate>
	<div class="flex flex-col gap-2 text-center">
		<h1 class="text-2xl font-semibold tracking-tight">Daftar</h1>
		<p class="text-sm text-muted-foreground">Buat akun untuk mulai belajar</p>
	</div>

	{#if serverError}
		<div class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{serverError}
		</div>
	{/if}

	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Nama</Form.Label>
				<Input
					{...props}
					type="text"
					bind:value={$formData.name}
					disabled={$submitting || pending}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Email</Form.Label>
				<Input
					{...props}
					type="email"
					placeholder="m@example.com"
					bind:value={$formData.email}
					disabled={$submitting || pending}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="password">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Kata Sandi</Form.Label>
				<Input
					{...props}
					type="password"
					bind:value={$formData.password}
					disabled={$submitting || pending}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="confirmPassword">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Konfirmasi Kata Sandi</Form.Label>
				<Input
					{...props}
					type="password"
					bind:value={$formData.confirmPassword}
					disabled={$submitting || pending}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Button class="w-full" disabled={$submitting || pending}>
		{$submitting || pending ? 'Membuat...' : 'Daftar'}
	</Form.Button>

	<div class="text-center text-sm">
		Sudah punya akun?
		<a href={resolve('/(auth)/login')} class="underline underline-offset-4">Masuk</a>
	</div>
</form>
