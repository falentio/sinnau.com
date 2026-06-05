<script lang="ts">
	import { resolve } from '$app/paths';
	import { createRng, Rng } from '$lib/utils/rng';
	import { Book03Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	type StudySet = {
		id: string;
		title: string;
		description: string | null;
	};

	let { studySet }: { studySet: StudySet } = $props();
	const rng = $derived(createRng(studySet.id));

	function getColor(rng: Rng) {
		const step = 30;
		const n = 360 / step;
		const hue = rng.range(n) * step;
		return `oklch(63.7% 0.237 ${hue})`;
	}

	const color = $derived(getColor(rng));
</script>

<a
	href={resolve('/(app)/study/[studySetId]/flashcard', { studySetId: studySet.id })}
	class="flex w-full flex-col gap-2 border-b bg-card p-3 text-card-foreground last:border-b-0"
>
	<!--- TODO extract bellow as component in features/study-set --->
	<div style:--primary={color}>
		<div class="w-min rounded-lg bg-primary/10 p-2 text-primary">
			<HugeiconsIcon icon={Book03Icon} />
		</div>
	</div>
	<div class="flex flex-col gap-1">
		<h3 class="w-max max-w-full truncate">
			{studySet.title}
		</h3>
		<div class="max-w-full truncate text-xs text-muted-foreground">
			{studySet.description ?? ''}
		</div>
	</div>
</a>
