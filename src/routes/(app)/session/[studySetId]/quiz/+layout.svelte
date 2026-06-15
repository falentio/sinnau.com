<script lang="ts">
  import SessionHeader from "$lib/components/features/quiz-session/session-header.svelte";

  import type { LayoutData } from "./$types";

  interface Props {
    data: LayoutData;
    children: import("svelte").Snippet;
  }
  let { data, children }: Props = $props();
</script>

<SessionHeader title={data.studySet.title} />
<main class="mx-auto w-full max-w-2xl px-6 py-6">
  {@render children()}
</main>
