<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PaginationContent from '$lib/components/ui/pagination/pagination-content.svelte';
	import PaginationEllipsis from '$lib/components/ui/pagination/pagination-ellipsis.svelte';
	import PaginationItem from '$lib/components/ui/pagination/pagination-item.svelte';
	import PaginationLink from '$lib/components/ui/pagination/pagination-link.svelte';
	import Pagination from '$lib/components/ui/pagination/pagination.svelte';

	import { ChatQuestion01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	type QuizStub = {
		id: string;
		questionText: string;
		options: {
			id: string;
			optionText: string;
			isCorrect: boolean;
			explanation: string;
		}[];
	};

	function buildOptionExplanation(
		questionText: string,
		correctAnswerText: string,
		isCorrect: boolean,
		correctExplanation: string
	) {
		if (isCorrect) return correctExplanation;
		return `Incorrect because this option does not answer "${questionText}". The correct answer is "${correctAnswerText}".`;
	}

	type QuizStubInput = {
		questionText: string;
		options: [string, string, string, string];
		correctIndex: number;
		explanation: string;
	};

	const quizStubInputs: QuizStubInput[] = [
		{
			questionText: 'Apa itu vektor?',
			options: [
				'Objek yang memiliki besar dan arah dalam ruang',
				'Susunan bilangan dalam baris dan kolom',
				'Nilai skalar yang menunjukkan sifat matriks',
				'Metode menyelesaikan sistem persamaan'
			],
			correctIndex: 0,
			explanation: 'Vektor selalu punya besar dan arah.'
		},
		{
			questionText: 'Apa itu matriks?',
			options: [
				'Sekumpulan bilangan acak tanpa pola',
				'Susunan bilangan dalam baris dan kolom',
				'Ruang semua solusi dari Ax = 0',
				'Skalar yang mengubah arah vektor'
			],
			correctIndex: 1,
			explanation: 'Matriks adalah susunan elemen dalam baris dan kolom.'
		},
		{
			questionText: 'Apa yang dimaksud determinan?',
			options: [
				'Jumlah seluruh elemen matriks',
				'Nilai skalar yang menunjukkan sifat matriks bujur sangkar',
				'Transpose dari sebuah matriks',
				'Hasil perkalian dua vektor'
			],
			correctIndex: 1,
			explanation: 'Determinan adalah nilai skalar dari matriks bujur sangkar.'
		},
		{
			questionText: 'Apa itu invers matriks?',
			options: [
				'Matriks yang jika dikalikan menghasilkan matriks identitas',
				'Matriks dengan semua elemen bernilai nol',
				'Matriks yang selalu berbentuk persegi panjang',
				'Matriks yang hanya berisi diagonal utama'
			],
			correctIndex: 0,
			explanation: 'Invers membuat hasil perkalian kembali ke identitas.'
		},
		{
			questionText: 'Kapan matriks memiliki invers?',
			options: [
				'Saat semua elemennya positif',
				'Saat determinannya tidak sama dengan nol',
				'Saat matriksnya memiliki lebih banyak baris daripada kolom',
				'Saat seluruh elemen diagonal bernilai satu'
			],
			correctIndex: 1,
			explanation: 'Matriks bujur sangkar memiliki invers jika determinannya tidak nol.'
		},
		{
			questionText: 'Apa itu matriks identitas?',
			options: [
				'Matriks yang mengubah semua vektor menjadi nol',
				'Matriks yang tidak mengubah vektor saat dikalikan',
				'Matriks dengan semua elemen sama',
				'Matriks yang selalu singular'
			],
			correctIndex: 1,
			explanation: 'Matriks identitas tidak mengubah hasil perkalian.'
		},
		{
			questionText: 'Apa itu basis?',
			options: [
				'Himpunan vektor bebas linear yang membentang suatu ruang',
				'Kumpulan vektor yang semuanya sama',
				'Sebuah matriks berukuran 3x3',
				'Nilai minimum dari sebuah transformasi'
			],
			correctIndex: 0,
			explanation: 'Basis harus bebas linear dan membentang ruang.'
		},
		{
			questionText: 'Apa itu span?',
			options: [
				'Hasil dari semua kombinasi linear sekumpulan vektor',
				'Jumlah semua elemen matriks',
				'Vektor yang berdiri sendiri tanpa kombinasi',
				'Nilai eigen dari transformasi linear'
			],
			correctIndex: 0,
			explanation: 'Span adalah seluruh kombinasi linear yang mungkin.'
		},
		{
			questionText: 'Apa arti bebas linear?',
			options: [
				'Vektor bisa dibentuk dari vektor lain',
				'Tidak ada vektor yang bisa dibentuk dari gabungan vektor lain',
				'Vektor selalu membentuk matriks identitas',
				'Vektor memiliki panjang yang sama'
			],
			correctIndex: 1,
			explanation: 'Bebas linear berarti tidak ada ketergantungan antar vektor.'
		},
		{
			questionText: 'Apa itu ruang nol (null space)?',
			options: [
				'Ruang yang berisi semua vektor hasil perkalian matriks',
				'Semua vektor yang dipetakan ke nol oleh matriks',
				'Ruang yang hanya berisi matriks identitas',
				'Kumpulan semua determinan'
			],
			correctIndex: 1,
			explanation: 'Null space adalah himpunan solusi dari Ax = 0.'
		},
		{
			questionText: 'Apa itu rank matriks?',
			options: [
				'Jumlah maksimum baris atau kolom yang bebas linear',
				'Jumlah semua elemen diagonal',
				'Banyaknya vektor nol',
				'Ukuran font dalam matriks'
			],
			correctIndex: 0,
			explanation: 'Rank mengukur dimensi ruang hasil atau baris/kolom independen.'
		},
		{
			questionText: 'Apa itu transpose?',
			options: [
				'Operasi yang menukar baris menjadi kolom',
				'Operasi yang membalik seluruh nilai menjadi negatif',
				'Metode menghapus baris nol',
				'Perkalian antara dua matriks identitas'
			],
			correctIndex: 0,
			explanation: 'Transpose menukar baris dan kolom.'
		}
	];

	const quizzesStub: QuizStub[] = quizStubInputs.map((quiz, index) => {
		const quizId = `qiz_${String(index + 1).padStart(18, '0')}`;
		const correctAnswerText = quiz.options[quiz.correctIndex];

		return {
			id: quizId,
			questionText: quiz.questionText,
			options: quiz.options.map((optionText, optionIndex) => ({
				id: `qop_${String(index * 4 + optionIndex + 1).padStart(18, '0')}`,
				optionText,
				isCorrect: optionIndex === quiz.correctIndex,
				explanation: buildOptionExplanation(
					quiz.questionText,
					correctAnswerText,
					optionIndex === quiz.correctIndex,
					quiz.explanation
				)
			}))
		};
	});

	let openExplanation = $state(false);
</script>

<div class="flex items-center justify-between">
	<h2 class="font-medium">Quiz ({quizzesStub.length})</h2>
	<div>
		<Button variant="outline" size="icon-sm" href="create">
			<HugeiconsIcon icon={PlusSignIcon} />
		</Button>
	</div>
</div>
<div class="flex w-min gap-1 rounded-full bg-card p-1 text-card-foreground shadow-2xs">
	<Button variant="outline">Terbaru</Button>
	<Button variant="ghost">Terlama</Button>
	<Button variant="ghost">Target Hari Ini</Button>
	<Button variant="ghost">Penting</Button>
</div>

<div class="space-y-3">
	{#each quizzesStub as quiz, i (quiz.id)}
		<div class="rounded-4xl bg-card text-card-foreground shadow-xs">
			<div class=" p-6">
				<div class="flex items-center gap-2">
					<Badge variant="outline">Soal #{i + 1}</Badge>
					<Badge variant="secondary">Pilihan Ganda</Badge>
					<span class="flex-auto"></span>
					<Button
						onclick={(e) => {
							openExplanation = !openExplanation;
							requestAnimationFrame(() => {
								e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
							});
						}}
						variant={openExplanation ? 'outline' : 'ghost'}
						size="icon-sm"
					>
						<HugeiconsIcon icon={ChatQuestion01Icon} />
					</Button>
				</div>
				<h3 class="mt-3 text-lg font-semibold">{quiz.questionText}</h3>

				<div class="mt-4 grid gap-2">
					{#each quiz.options as option, optionIndex (option.id)}
						<div class="flex items-center gap-3 rounded-2xl border bg-background/50 p-4">
							<div
								class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
							>
								{String.fromCharCode(65 + optionIndex)}
							</div>
							<div class="min-w-0 flex-1">
								<div class=" gap-2">
									{#if option.isCorrect}
										<Badge class="inline-flex">Jawaban benar</Badge>
									{/if}
									<p class="font-medium">{option.optionText}</p>
								</div>
								{#if option.explanation && openExplanation}
									<p class="mt-1 text-sm text-muted-foreground">{option.explanation}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

<div>
	<Pagination count={quizzesStub.length} page={1} perPage={10}>
		{#snippet children({ currentPage, pages })}
			<PaginationContent>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
					{:else}
						<PaginationItem>
							<PaginationLink isActive={page.value === currentPage} {page}
								>{page.value}</PaginationLink
							>
						</PaginationItem>
					{/if}
				{/each}
			</PaginationContent>{/snippet}</Pagination
	>
</div>
