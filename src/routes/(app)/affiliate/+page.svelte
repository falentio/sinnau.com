<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import {
    Alert02Icon,
    ArrowLeft01Icon,
    CheckmarkCircle02Icon,
    Copy01Icon,
    Dollar01Icon,
    HourglassIcon,
    InstagramIcon,
    Link03Icon,
    PieChartIcon,
    Share01Icon,
    TiktokIcon,
    TimeQuarterPassIcon,
    Wallet01Icon,
    YoutubeIcon,
  } from "$lib/components/features/icons";
  import SeoHead from "$lib/components/seo-head.svelte";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Textarea } from "$lib/components/ui/textarea";
  import { client } from "$lib/orpc";
  import type { ApplyAffiliateInput } from "$lib/schemas/affiliate";
  import { applyAffiliateInputSchema } from "$lib/schemas/affiliate";
  import { AFFILIATE_COMMISSION_RATE } from "$lib/schemas/affiliate.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let copied = $state(false);

  const commissionLabel = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`;

  const profile = $derived(data.summary.profile);

  const pendingApplication = $derived(
    profile || data.application?.status !== "PENDING" ? null : data.application
  );

  const rejectedApplication = $derived(
    profile || data.application?.status !== "REJECTED" ? null : data.application
  );

  const referralUrl = $derived(
    profile ? new URL(`/r/${profile.slug}`, data.origin).href : ""
  );

  const submittedHandles = $derived(
    [
      {
        icon: InstagramIcon,
        value: pendingApplication?.instagramHandle,
      },
      {
        icon: TiktokIcon,
        value: pendingApplication?.tiktokHandle,
      },
      {
        icon: YoutubeIcon,
        value: pendingApplication?.youtubeHandle,
      },
    ].filter((handle) => handle.value)
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      minimumFractionDigits: 0,
      style: "currency",
    }).format(value);

  const formatDate = (value: Date) =>
    value.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handleCopy = async () => {
    if (!profile) {
      return;
    }
    await navigator.clipboard.writeText(referralUrl);
    copied = true;
    track(AnalyticsEvent.AFFILIATE_LINK_COPIED, {
      slug: profile.slug,
    });
    setTimeout(() => {
      copied = false;
    }, 2000);
  };

  const submitApplication = async (input: ApplyAffiliateInput) => {
    try {
      await client.affiliate.apply(input);
      toast.success("Aplikasi terkirim. Tunggu kabar dari kami!", {
        position: "top-right",
      });
      await invalidateAll();
    } catch (error) {
      if (error instanceof ORPCError) {
        if (error.code === "UNAUTHORIZED") {
          await goto(resolve("/(auth)/login"));
          return;
        }
        toast.error(error.message, { position: "top-right" });
      } else if (error instanceof Error) {
        toast.error(error.message, { position: "top-right" });
      } else {
        toast.error("Aplikasi belum bisa dikirim. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    }
  };

  const initialApplication = untrack(() =>
    data.application?.status === "REJECTED" ? data.application : null
  );

  const form = superForm(
    defaults<ApplyAffiliateInput>(
      {
        advantage: initialApplication?.advantage ?? "",
        instagramHandle: initialApplication?.instagramHandle ?? "",
        tiktokHandle: initialApplication?.tiktokHandle ?? "",
        youtubeHandle: initialApplication?.youtubeHandle ?? "",
      },
      valibotClient(applyAffiliateInputSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        await submitApplication(submittedForm.data);
      },
      resetForm: false,
      validators: valibotClient(applyAffiliateInputSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;
  const advantageCount = $derived($formData.advantage.trim().length);
</script>

<SeoHead
  title="Afiliasi · sinnau"
  description="Program afiliasi Sinnau — bagikan tautan referral-mu dan dapatkan komisi dari setiap langganan yang lewat."
  robots="noindex"
/>

<div class="mx-auto w-full max-w-3xl px-6 pt-10 pb-16 md:pt-14">
  <div class="mb-6 md:mb-8">
    <a
      href="/home"
      class="group inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
    >
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
      />
      Kembali
    </a>
  </div>

  {#if profile}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Sebarkan tautanmu, panen komisinya
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Bagikan tautan di bawah ini — setiap langganan yang lewat otomatis
        menambah saldomu sebesar {commissionLabel} dari nilai transaksi.
      </p>
    </header>

    <section
      class="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card p-5 ring-1 ring-foreground/[0.04] md:p-6"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <span
            class="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300"
          >
            Tautan referral
          </span>
          <p class="text-sm text-muted-foreground">
            Satu tautan untuk semua platform — bio, story, atau grup belajar.
          </p>
        </div>
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
        >
          <HugeiconsIcon icon={Share01Icon} class="size-4" />
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2">
        <InputGroup.Root class="min-w-0 flex-1 border-border/60 bg-background">
          <InputGroup.Text class="text-muted-foreground">
            <HugeiconsIcon icon={Link03Icon} class="size-4" />
          </InputGroup.Text>
          <InputGroup.Input
            readonly
            value={referralUrl}
            title={referralUrl}
            aria-label="Tautan referral kamu"
            class="font-mono text-[13px]"
          />
        </InputGroup.Root>
        <Button size="sm" class="shrink-0" onclick={handleCopy}>
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            class="size-3.5"
          />
          {copied ? "Tersalin!" : "Salin"}
        </Button>
      </div>
    </section>

    <section class="mt-4 flex flex-col gap-3">
      <div class="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div class="flex items-center gap-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
          >
            <HugeiconsIcon icon={Wallet01Icon} class="size-4.5" />
          </div>
          <div class="min-w-0">
            <p class="text-[13px] text-muted-foreground">Saldo menunggu</p>
            <p
              class="truncate font-heading text-2xl font-semibold tracking-[-0.02em] tabular-nums md:text-3xl"
            >
              {formatCurrency(data.summary.pendingBalance)}
            </p>
          </div>
        </div>
        <p class="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          Komisi yang belum dibayarkan — pencairan dilakukan berkala oleh tim
          Sinnau.
        </p>
      </div>

      <div
        class="grid divide-y divide-border/60 rounded-2xl border border-border/60 bg-card md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <div class="p-5">
          <p class="text-[13px] text-muted-foreground">Total didapat</p>
          <p
            class="mt-1 font-heading text-xl font-semibold tracking-[-0.01em] tabular-nums"
          >
            {formatCurrency(data.summary.totalEarned)}
          </p>
        </div>
        <div class="p-5">
          <p class="text-[13px] text-muted-foreground">Konversi</p>
          <p class="mt-1 font-heading text-xl font-semibold tabular-nums">
            {data.summary.conversionCount}
            <span class="text-sm font-normal text-muted-foreground"
              >langganan</span
            >
          </p>
        </div>
        <div class="p-5">
          <p class="text-[13px] text-muted-foreground">Sudah dibayar</p>
          <p
            class="mt-1 font-heading text-xl font-semibold tracking-[-0.01em] tabular-nums"
          >
            {formatCurrency(data.summary.totalPaid)}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-10 border-t border-border/60 pt-8 md:mt-12">
      <h2
        class="font-heading text-xl font-semibold tracking-[-0.02em] md:text-2xl"
      >
        Cara kerjanya
      </h2>
      <ol class="mt-5 divide-y divide-border/60">
        <li class="flex gap-4 py-4 first:pt-0">
          <span
            class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
            >01</span
          >
          <div>
            <p class="text-sm font-medium">Bagikan tautanmu</p>
            <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              Taruh di bio, story, atau grup belajar — di mana pun audiensmu
              biasa nongkrong.
            </p>
          </div>
        </li>
        <li class="flex gap-4 py-4">
          <span
            class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
            >02</span
          >
          <div>
            <p class="text-sm font-medium">Temanmu berlangganan</p>
            <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              Klik tercatat selama 30 hari. Begitu mereka membeli paket,
              konversinya otomatis jadi milikmu.
            </p>
          </div>
        </li>
        <li class="flex gap-4 py-4 last:pb-0">
          <span
            class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
            >03</span
          >
          <div>
            <p class="text-sm font-medium">Komisi masuk saldo</p>
            <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {commissionLabel} dari nilai transaksi langsung menambah saldo menunggu
              di halaman ini.
            </p>
          </div>
        </li>
      </ol>
    </section>

    <footer
      class="mt-10 border-t border-border/60 pt-6 text-[13px] leading-relaxed text-muted-foreground"
    >
      Komisi dihitung dari nilai paket yang dibeli lewat tautanmu, dan tercatat
      otomatis begitu transaksi selesai.
    </footer>
  {:else if pendingApplication}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Aplikasimu sedang ditinjau
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Santai dulu — tim Sinnau sedang memeriksa aplikasimu. Halaman ini
        berubah begitu ada keputusan.
      </p>
    </header>

    <section class="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
        >
          <HugeiconsIcon icon={HourglassIcon} class="size-3.5" />
          Menunggu peninjauan
        </span>
        <span class="text-[13px] text-muted-foreground">
          Dikirim {formatDate(pendingApplication.createdAt)}
        </span>
      </div>

      <div class="mt-5 flex flex-col gap-5 border-t border-border/60 pt-5">
        {#if submittedHandles.length > 0}
          <div>
            <p class="text-[13px] text-muted-foreground">
              Akun yang kamu daftarkan
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each submittedHandles as handle (handle.value)}
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
            {pendingApplication.advantage}
          </p>
        </div>
      </div>
    </section>

    <p class="mt-6 text-[13px] leading-relaxed text-muted-foreground">
      Sambil menunggu, siapkan konten terbaikmu — begitu disetujui, tautan
      referral-mu langsung aktif di halaman ini.
    </p>
  {:else}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Jadi afiliasi Sinnau
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Cuma butuh satu tautan: bagikan ke audiensmu dan dapatkan
        {commissionLabel} dari setiap langganan yang lewat.
      </p>
    </header>

    {#if rejectedApplication}
      <Alert variant="destructive" class="mb-6">
        <HugeiconsIcon icon={Alert02Icon} />
        <AlertTitle>Aplikasi sebelumnya belum lolos</AlertTitle>
        <AlertDescription>
          Nggak apa-apa — perkuat jawabanmu di bawah dan kirim ulang. Tim kami
          akan meninjau lagi.
        </AlertDescription>
      </Alert>
    {/if}

    <div class="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:gap-10">
      <aside>
        <h2 class="font-heading text-lg font-semibold tracking-[-0.02em]">
          Kenapa ikut
        </h2>
        <ul class="mt-4 divide-y divide-border/60">
          <li class="flex gap-3.5 py-4 first:pt-0">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
            >
              <HugeiconsIcon icon={Dollar01Icon} class="size-4" />
            </div>
            <div>
              <p class="text-sm font-medium">
                Komisi {commissionLabel} per transaksi
              </p>
              <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Dihitung dari nilai paket yang dibeli lewat tautan referral-mu.
              </p>
            </div>
          </li>
          <li class="flex gap-3.5 py-4">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
            >
              <HugeiconsIcon icon={TimeQuarterPassIcon} class="size-4" />
            </div>
            <div>
              <p class="text-sm font-medium">Klik tercatat 30 hari</p>
              <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Temanmu nggak harus langsung bayar — konversi tetap jadi
                milikmu.
              </p>
            </div>
          </li>
          <li class="flex gap-3.5 py-4 last:pb-0">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
            >
              <HugeiconsIcon icon={PieChartIcon} class="size-4" />
            </div>
            <div>
              <p class="text-sm font-medium">Semuanya terpantau</p>
              <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Konversi, saldo, dan pembayaran tercatat otomatis di dashboard
                ini.
              </p>
            </div>
          </li>
        </ul>
      </aside>

      <form
        method="POST"
        novalidate
        use:enhance
        class="flex flex-col gap-5 self-start rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <Form.Field {form} name="advantage">
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center justify-between gap-3">
                <Form.Label>Kenapa kamu cocok jadi afiliasi?</Form.Label>
                <span class="text-xs text-muted-foreground"
                  >{advantageCount}/1000</span
                >
              </div>
              <Textarea
                {...props}
                bind:value={$formData.advantage}
                placeholder="Ceritakan audiensmu, jangkauanmu, dan caramu mempromosikan Sinnau..."
                rows={5}
                disabled={$submitting}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="instagramHandle">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Instagram</Form.Label>
              <Input
                {...props}
                bind:value={$formData.instagramHandle}
                placeholder="@username"
                disabled={$submitting}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="tiktokHandle">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>TikTok</Form.Label>
              <Input
                {...props}
                bind:value={$formData.tiktokHandle}
                placeholder="@username"
                disabled={$submitting}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="youtubeHandle">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>YouTube</Form.Label>
              <Input
                {...props}
                bind:value={$formData.youtubeHandle}
                placeholder="@channel atau link channel"
                disabled={$submitting}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <p class="-mt-1 text-xs leading-relaxed text-muted-foreground">
          Kolom sosial opsional — tapi akun yang aktif bikin aplikasimu lebih
          cepat dilirik.
        </p>

        <Form.Button disabled={$submitting}>
          {$submitting ? "Mengirim..." : "Kirim aplikasi"}
        </Form.Button>
      </form>
    </div>
  {/if}
</div>
