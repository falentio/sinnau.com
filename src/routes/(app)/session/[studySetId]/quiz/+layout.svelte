<script lang="ts">
  import SessionHeader from "$lib/components/features/quiz-session/session-header.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";

  import type { LayoutData } from "./$types";

  interface Props {
    data: LayoutData;
    children: import("svelte").Snippet;
  }
  let { data, children }: Props = $props();
</script>

<SeoHead
  title="Quiz - {data.studySet.title} · sinnau"
  description="Kerjakan kuis {data.studySet
    .title} — jawab soal pilihan ganda, cek skor, dan lihat pembahasan buat persiapan ujian di sinnau."
  robots="noindex"
/>

<SessionHeader title={data.studySet.title} />
<main class="mx-auto w-full max-w-2xl px-6 py-6">
  {@render children()}
</main>
