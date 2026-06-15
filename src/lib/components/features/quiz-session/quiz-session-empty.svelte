<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
</script>

<div
  class="flex flex-col items-center gap-3 rounded-4xl border bg-card p-6 text-card-foreground shadow-xs"
>
  <p class="text-sm text-muted-foreground">Belum ada quiz di sini</p>
  <Button variant="outline" href="/study/{page.params.studySetId}/quiz/create/">
    Buat quiz
  </Button>
</div>
