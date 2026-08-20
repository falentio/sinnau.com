<script lang="ts">
  import {
    HourglassIcon,
    InstagramIcon,
    TiktokIcon,
    YoutubeIcon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const formatDate = (value: Date) =>
    value.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  let {
    application,
  }: {
    application: {
      advantage: string;
      createdAt: Date;
      instagramHandle: string | null;
      tiktokHandle: string | null;
      youtubeHandle: string | null;
    };
  } = $props();

  let submittedHandles = $derived(
    [
      {
        icon: InstagramIcon,
        platform: "instagram",
        value: application.instagramHandle,
      },
      {
        icon: TiktokIcon,
        platform: "tiktok",
        value: application.tiktokHandle,
      },
      {
        icon: YoutubeIcon,
        platform: "youtube",
        value: application.youtubeHandle,
      },
    ].filter((handle) => handle.value)
  );
</script>

<section class="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
    >
      <HugeiconsIcon icon={HourglassIcon} class="size-3.5" />
      Menunggu peninjauan
    </span>
    <span class="text-[13px] text-muted-foreground">
      Dikirim {formatDate(application.createdAt)}
    </span>
  </div>

  <div class="mt-5 flex flex-col gap-5 border-t border-border/60 pt-5">
    {#if submittedHandles.length > 0}
      <div>
        <p class="text-[13px] text-muted-foreground">
          Akun yang kamu daftarkan
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          {#each submittedHandles as handle (handle.platform)}
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-foreground"
            >
              <HugeiconsIcon
                icon={handle.icon}
                class="size-3.5 text-muted-foreground"
              />
              {handle.value}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div>
      <p class="text-[13px] text-muted-foreground">Jawabanmu</p>
      <p class="mt-1.5 text-sm leading-relaxed whitespace-pre-line">
        {application.advantage}
      </p>
    </div>
  </div>
</section>
