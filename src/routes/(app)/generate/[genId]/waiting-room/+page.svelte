<script lang="ts">
  import { goto } from "$app/navigation";
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import Feed from "$lib/components/features/waiting-room/feed.svelte";
  import ProgressRing from "$lib/components/features/waiting-room/progress-ring.svelte";
  import { createItemRevealer } from "$lib/components/features/waiting-room/waiting-room.revealer.svelte";
  import { FEED_ITEM_LIMIT } from "$lib/components/features/waiting-room/waiting-room.utils";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { onMount } from "svelte";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const initialCheck = $derived(data.initialCheck);

  const ESTIMATED_DURATION_MS = 20 * 60 * 1000;
  const POLL_INTERVAL_MS = 15_000;
  const RETRY_INTERVAL_MS = POLL_INTERVAL_MS * 2;

  // svelte-ignore state_referenced_locally
  let status = $state(initialCheck.status);
  // svelte-ignore state_referenced_locally
  let since = $state<number | undefined>(
    initialCheck.maxCreatedAt ?? undefined
  );
  // svelte-ignore state_referenced_locally
  const revealer = createItemRevealer({ initialChunks: initialCheck.chunks });
  const items = $derived(revealer.items);
  // svelte-ignore state_referenced_locally
  let isInputTruncated = $state(initialCheck.isInputTruncated);
  let isRetrying = $state(false);
  let pollTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

  // svelte-ignore state_referenced_locally
  const startedAt = $state(initialCheck.startedAt);
  const totalElapsedMs = $derived(Date.now() - startedAt);
  const estimatedCompletedAt = $derived(
    new Date(Date.now() + Math.max(ESTIMATED_DURATION_MS - totalElapsedMs, 0))
  );

  const STATUS_TEXT_MAP: Record<string, string> = {
    COMPLETED: "Materi siap",
    CREATED: "Memulai pembuatan materi…",
    FAILED: "Gagal membuat materi",
    ONGOING: "Membuat materimu…",
    PARTIAL_COMPLETED: "Sebagian materi berhasil dibuat",
  };

  const statusText = $derived(STATUS_TEXT_MAP[status] ?? "Membuat materimu…");

  const isTerminal = $derived(
    status === "COMPLETED" ||
      status === "FAILED" ||
      status === "PARTIAL_COMPLETED"
  );

  const poll = async () => {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }

    try {
      const result = await client.generate.check({
        id: data.generateId,
        since,
      });

      isRetrying = false;
      ({ status } = result);
      ({ isInputTruncated } = result);

      if (result.status === "COMPLETED") {
        await goto(`/study/${data.studySetId}`);
        return;
      }

      revealer.enqueue(result.chunks, { since });

      if (result.maxCreatedAt) {
        since = result.maxCreatedAt;
      }

      if (!isTerminal) {
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch {
      isRetrying = true;
      pollTimeout = setTimeout(poll, RETRY_INTERVAL_MS);
    }
  };

  onMount(() => {
    if (isTerminal) {
      return;
    }

    poll();
    return () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      revealer.dispose();
    };
  });
</script>

<div class="max-w-2xl w-full flex justify-start mx-auto">
  <Button href="/home" variant="ghost"
    ><HugeiconsIcon icon={ArrowLeft01Icon} /> Kembali
  </Button>
</div>
<div class="flex flex-col items-center py-8">
  <h1 class="mt-6 text-center text-lg font-semibold text-foreground">
    {statusText}
  </h1>
  <p class="mt-2 text-center text-sm text-muted-foreground">
    Estimasi selesai {estimatedCompletedAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </p>

  {#if !isTerminal}
    <div class="mt-5 flex items-center gap-1.5" aria-hidden="true">
      <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground"
      ></span>
      <span
        class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:120ms]"
      ></span>
      <span
        class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:240ms]"
      ></span>
    </div>
  {/if}

  {#if isRetrying}
    <p class="mt-4 text-xs text-muted-foreground">Menyambungkan kembali…</p>
  {/if}

  {#if isInputTruncated}
    <p class="mt-4 max-w-sm text-center text-xs text-amber-600">
      PDF terlalu panjang; hanya sebagian yang diproses.
    </p>
  {/if}

  {#if status === "FAILED" || status === "PARTIAL_COMPLETED"}
    <div class="mt-8 text-center">
      <p class="text-sm text-muted-foreground">
        {status === "FAILED"
          ? "Terjadi kesalahan saat membuat materi."
          : "Beberapa materi berhasil dibuat, namun tidak semuanya."}
      </p>
      <Button class="mt-4" href="/study/{data.studySetId}">Lihat materi</Button>
    </div>
  {/if}

  {#if items.length > 0}
    <div class="mt-10 w-full max-w-2xl px-6">
      <p
        class="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Materi yang sudah dibuat
      </p>
      <Feed {items} />
      {#if items.length >= FEED_ITEM_LIMIT}
        <p class="mt-3 text-center text-xs text-muted-foreground">
          Menampilkan {FEED_ITEM_LIMIT} item terbaru
        </p>
      {/if}
    </div>
  {/if}
</div>
