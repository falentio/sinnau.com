<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import {
    File01Icon,
    AiBeautifyIcon,
    QuillWrite01Icon,
    Book03Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
</script>

<Empty>
  <EmptyHeader>
    <EmptyMedia>
      <HugeiconsIcon icon={Book03Icon} />
    </EmptyMedia>
    <EmptyTitle>Belum ada modul belajar</EmptyTitle>
    <EmptyDescription>
      Kamu belum memiliki modul belajar, kami memiliki fitur generate
      menggunakan AI yang bisa membantumu.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <div class="flex gap-2">
      <Button size="sm" variant="outline" href="/study/new">
        <HugeiconsIcon icon={QuillWrite01Icon} />
        Buat manual
      </Button>
      <Button size="sm" href="/study/generate">
        <HugeiconsIcon icon={AiBeautifyIcon} />
        Buat dengan AI
      </Button>
    </div>
  </EmptyContent>
</Empty>
