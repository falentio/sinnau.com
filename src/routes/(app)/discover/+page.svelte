<script lang="ts">
  import { dev } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import StudySetItem from "$lib/components/features/app/study-set-item.svelte";
  import {
    ArrowLeft01Icon,
    Cancel01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import InputGroupAddon from "$lib/components/ui/input-group/input-group-addon.svelte";
  import InputGroupButton from "$lib/components/ui/input-group/input-group-button.svelte";
  import InputGroupInput from "$lib/components/ui/input-group/input-group-input.svelte";
  import InputGroup from "$lib/components/ui/input-group/input-group.svelte";
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
  import { client } from "$lib/orpc";
  import type { StudySetSearchResult } from "$lib/schemas/study-set-search";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const DEV_STUB_MODES = new Set(["empty", "error", "results5", "results20"]);

  const STUB_TITLES = [
    "Dasar Fisika",
    "Aljabar Linear",
    "Kimia Organik",
    "Biologi Molekuler",
    "Statistika Dasar",
    "Kalkulus Lanjut",
    "Ekonomi Mikro",
    "Sosiologi Umum",
    "Bahasa Indonesia",
    "Literasi Digital",
    "Geografi Indonesia",
    "Sejarah Dunia",
    "Filsafat Dasar",
    "Etika Profesi",
    "Manajemen Waktu",
    "Kewirausahaan",
    "Pemrograman Web",
    "Desain Grafis",
    "Jaringan Komputer",
    "Kecerdasan Buatan",
  ];

  const STUB_DATA: StudySetSearchResult[] = Array.from(
    { length: 20 },
    (_, i) => ({
      description:
        "Modul pembelajaran komprehensif mencakup teori dasar, latihan soal, dan rangkuman materi untuk persiapan ujian.",
      id: `sts_stub_${String(i + 1).padStart(2, "0")}`,
      slug: `stub-modul-${i + 1}`,
      title: `Modul Belajar ${i + 1}: ${STUB_TITLES[i]}`,
    })
  );

  const stubMode = $derived(dev ? page.url.searchParams.get("stub") : null);

  let query = $state("");
  let results = $state<StudySetSearchResult[]>([]);
  let isLoading = $state(false);
  let hasSearched = $state(false);
  let error = $state<string | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const oninput = (e: Event) => {
    const { value } = e.target as HTMLInputElement;
    query = value;
    clearTimeout(debounceTimer);

    if (value.trim().length < 3) {
      results = [];
      hasSearched = false;
      isLoading = false;
      error = null;
      return;
    }

    isLoading = true;
    error = null;

    debounceTimer = setTimeout(async () => {
      if (stubMode && DEV_STUB_MODES.has(stubMode)) {
        if (stubMode === "empty") {
          results = [];
          hasSearched = true;
        } else if (stubMode === "error") {
          error = "Maaf, pencarian gagal. Coba lagi dalam beberapa saat.";
        } else if (stubMode === "results5") {
          results = STUB_DATA.slice(0, 5);
          hasSearched = true;
        } else if (stubMode === "results20") {
          results = STUB_DATA;
          hasSearched = true;
        }
        isLoading = false;
        return;
      }

      try {
        const data = await client.studySetSearch.search({
          query: value.trim(),
        });
        results = data;
        hasSearched = true;
        track(AnalyticsEvent.DISCOVER_SEARCHED, {
          query_length: value.trim().length,
          results_count: data.length,
        });
      } catch {
        error = "Maaf, pencarian gagal. Coba lagi dalam beberapa saat.";
      } finally {
        isLoading = false;
      }
    }, 300);
  };

  const clear = () => {
    query = "";
    results = [];
    hasSearched = false;
    isLoading = false;
    error = null;
    clearTimeout(debounceTimer);
  };

  const showEmptyHint = $derived(
    !isLoading && !hasSearched && !error && results.length === 0
  );
  const showNoResults = $derived(
    !isLoading && hasSearched && results.length === 0
  );

  const goStub = (mode: string | null) => {
    const url = new URL(page.url);
    if (mode) {
      url.searchParams.set("stub", mode);
    } else {
      url.searchParams.delete("stub");
    }
    goto(url, { noScroll: true, replaceState: true });
  };
</script>

<SeoHead
  title="Jelajahi Modul Belajar Komunitas · sinnau"
  description="Temukan modul belajar dari berbagai mata kuliah, dibuat oleh sesama mahasiswa Indonesia. Cari, pelajari, dan kuasai materi kampus dengan sistem AI spaced repetition."
  robots="noindex"
/>

<div class="bg-card text-card-foreground">
  <div class="mx-auto flex w-full max-w-2xl flex-col px-6 pt-6">
    <div class="mb-2 flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight">Jelajahi</h1>
      <p class="text-sm text-muted-foreground">
        Temukan modul belajar buatan komunitas — dari sesama mahasiswa.
      </p>
    </div>
  </div>
</div>
<div class="sticky top-0 z-20 bg-card text-card-foreground shadow-xs">
  <div class="mx-auto flex w-full max-w-2xl flex-col px-6 py-3">
    <InputGroup>
      <InputGroupInput
        bind:value={query}
        {oninput}
        placeholder="Cari judul atau deskripsi modul..."
        type="search"
      />
      <InputGroupAddon align="inline-start">
        <HugeiconsIcon icon={Search02Icon} />
      </InputGroupAddon>
      {#if query}
        <InputGroupButton onclick={clear}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </InputGroupButton>
      {/if}
    </InputGroup>
    {#if dev}
      <div class="flex flex-wrap gap-1 mt-2">
        <Button
          size="sm"
          variant={stubMode === null ? "outline" : "ghost"}
          onclick={() => goStub(null)}
        >
          real
        </Button>
        <Button
          size="sm"
          variant={stubMode === "empty" ? "outline" : "ghost"}
          onclick={() => goStub("empty")}
        >
          empty
        </Button>
        <Button
          size="sm"
          variant={stubMode === "error" ? "outline" : "ghost"}
          onclick={() => goStub("error")}
        >
          error
        </Button>
        <Button
          size="sm"
          variant={stubMode === "results5" ? "outline" : "ghost"}
          onclick={() => goStub("results5")}
        >
          5 items
        </Button>
        <Button
          size="sm"
          variant={stubMode === "results20" ? "outline" : "ghost"}
          onclick={() => goStub("results20")}
        >
          20 items
        </Button>
      </div>
    {/if}
  </div>
</div>

<div class="mx-auto flex w-full max-w-2xl flex-col px-6 mt-4">
  {#if error}
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Cancel01Icon} />
        </EmptyMedia>
        <EmptyTitle>Terjadi kesalahan</EmptyTitle>
        <EmptyDescription>{error}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  {:else if isLoading}
    <div class="flex flex-col overflow-hidden rounded-2xl">
      {#each { length: 5 } as _, i}
        <div class="flex flex-col gap-2 border-b p-3 last:border-b-0">
          <Skeleton class="size-8 rounded-lg" />
          <Skeleton class="h-4 w-3/5" />
          <Skeleton class="h-3 w-4/5" />
        </div>
      {/each}
    </div>
  {:else if showNoResults}
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Search02Icon} />
        </EmptyMedia>
        <EmptyTitle>Tidak ditemukan</EmptyTitle>
        <EmptyDescription>
          Tidak ada modul yang cocok dengan pencarianmu. Coba kata kunci lain.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  {:else if results.length > 0}
    <div class="flex flex-col overflow-hidden rounded-2xl">
      {#each results as studySet (studySet.id)}
        <StudySetItem {studySet} />
      {/each}
    </div>
  {:else if showEmptyHint}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div
        class="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <HugeiconsIcon icon={Search02Icon} class="size-5" />
      </div>
      <p class="text-sm text-muted-foreground">
        Ketik kata kunci untuk mulai mencari — coba 'fisika', 'sejarah', atau
        topik favoritmu.
      </p>
    </div>
  {/if}
</div>
