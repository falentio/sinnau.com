<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ButtonGroup } from '$lib/components/ui/button-group/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import { ORPCError } from '@orpc/client';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		title: string;
		description: string;
		count: number;
		min?: number;
		max?: number;
		presets?: readonly number[];
		submitLabel: string;
		successMessage: (count: number) => string;
		fallbackError: string;
		onSubmit: (count: number) => Promise<void>;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		count = $bindable(0),
		min = 1,
		max = 200,
		presets = [10, 20, 30, 50, 100] as const,
		submitLabel,
		successMessage,
		fallbackError,
		onSubmit,
		children
	}: Props = $props();

	let pending = $state(false);

	async function handleSubmit() {
		pending = true;
		try {
			await onSubmit(count);
			open = false;
			toast.success(successMessage(count), { position: 'top-right' });
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
				toast.error(fallbackError, { position: 'top-right' });
			}
		} finally {
			pending = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3">
			<label for="dev-create-count" class="text-sm font-medium">Jumlah</label>
			<Input id="dev-create-count" type="number" {min} {max} bind:value={count} />
			<ButtonGroup>
				{#each presets as preset (preset)}
					<Button
						variant={count === preset ? 'default' : 'outline'}
						size="sm"
						onclick={() => (count = preset)}
					>
						{preset}
					</Button>
				{/each}
			</ButtonGroup>
			{@render children?.()}
		</div>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline" disabled={pending}>Batal</Button>
				{/snippet}
			</Dialog.Close>
			<Button onclick={handleSubmit} disabled={pending}>
				{submitLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
