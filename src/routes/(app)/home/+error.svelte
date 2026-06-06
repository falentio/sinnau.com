<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import EmptyContent from '$lib/components/ui/empty/empty-content.svelte';
	import EmptyDescription from '$lib/components/ui/empty/empty-description.svelte';
	import EmptyHeader from '$lib/components/ui/empty/empty-header.svelte';
	import EmptyMedia from '$lib/components/ui/empty/empty-media.svelte';
	import EmptyTitle from '$lib/components/ui/empty/empty-title.svelte';
	import Empty from '$lib/components/ui/empty/empty.svelte';
	import {
		Alert02Icon,
		ArrowLeft01Icon,
		Home01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	const errorMap: Record<string, { title: string; message: string }> = {
		INTERNAL_SERVER_ERROR: {
			message: 'Server mengalami masalah yang tak terduga. Coba beberapa saat lagi.',
			title: 'Masalah Internal Server'
		},
		'filter unknown': {
			message: 'Filter yang dipilih tidak dikenali. Silakan pilih filter yang tersedia.',
			title: 'Filter tidak valid'
		},
		'invalid query': {
			message:
				'Parameter yang diberikan tidak sesuai. Silakan periksa halaman atau filter yang dipilih.',
			title: 'Permintaan tidak valid'
		}
	};

	const friendlyError = $derived(
		errorMap[page.error?.message ?? ''] ??
    errorMap[page.error?.code ?? ''] ?? {
				message: page.error?.message ?? 'Terjadi kesalahan. Coba lagi nanti.',
				title: 'Terjadi kesalahan'
			}
	);
</script>

<div id="study-set-display" class="mx-auto flex w-full max-w-2xl flex-col px-6">
	<Empty>
		<EmptyHeader>
			<EmptyMedia variant="icon" class="bg-destructive/10">
				<HugeiconsIcon class="text-destructive" icon={Alert02Icon} />
			</EmptyMedia>
			<EmptyTitle class="text-destructive">{friendlyError.title}</EmptyTitle>
			<EmptyDescription>
				{friendlyError.message}
			</EmptyDescription>
		</EmptyHeader>
		<EmptyContent>
			<div class="flex gap-2">
				<Button variant="outline" href="/home/" size="sm">
					<HugeiconsIcon icon={Home01Icon} />
					Beranda
				</Button>
				<Button onclick={() => history.back()} size="sm">
					<HugeiconsIcon icon={ArrowLeft01Icon} />
					Kembali
				</Button>
			</div>
		</EmptyContent>
	</Empty>
</div>
