<script lang="ts">
	import { resolve } from '$app/paths';
	import LoginForm from '$lib/components/login-form.svelte';
	import { AiBeautifyIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
</script>

<div class="grid min-h-svh bg-background lg:grid-cols-2">
	<div class="flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center gap-2 md:justify-start">
			<a href={resolve('/')} class="flex items-center gap-2 font-medium">
				<div
					class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
				>
					<HugeiconsIcon icon={AiBeautifyIcon} class="size-4" />
				</div>
				Sinnau
			</a>
		</div>

		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-xs">
				<LoginForm />
			</div>
		</div>
	</div>

	<div class="relative hidden overflow-hidden bg-muted lg:block">
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--primary),transparent_28rem),linear-gradient(135deg,var(--muted),var(--background))] opacity-70"
		></div>
		<div class="absolute inset-0 flex items-center justify-center p-12">
			<div class="max-w-md space-y-4 text-center">
				<div
					class="mx-auto flex size-16 items-center justify-center rounded-4xl bg-primary text-primary-foreground shadow-lg"
				>
					<HugeiconsIcon icon={AiBeautifyIcon} class="size-8" />
				</div>
				<h2 class="text-3xl font-semibold tracking-tight">Study smarter with Sinnau</h2>
				<p class="text-muted-foreground">
					Create focused study sets, practice with flashcards, and keep your learning moving.
				</p>
			</div>
		</div>
	</div>
</div>
