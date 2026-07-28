<script lang="ts">
  import {
    Alert02Icon,
    Dollar01Icon,
    PieChartIcon,
    TimeQuarterPassIcon,
  } from "$lib/components/features/icons";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type {
    AffiliateApplyFormObject,
    AffiliateApplyFormData,
  } from "./create-apply-form.svelte";

  let {
    commissionLabel,
    advantageCount,
    enhance,
    form,
    formData,
    submitting = false,
    rejected = false,
  }: {
    commissionLabel: string;
    advantageCount: number;
    enhance: (formElement: HTMLFormElement) => { destroy: () => void };
    form: AffiliateApplyFormObject;
    formData: AffiliateApplyFormData;
    submitting?: boolean;
    rejected?: boolean;
  } = $props();
</script>

{#if rejected}
  <Alert variant="destructive" class="mb-6">
    <HugeiconsIcon icon={Alert02Icon} />
    <AlertTitle>Aplikasi sebelumnya belum lolos</AlertTitle>
    <AlertDescription>
      Nggak apa-apa. Perkuat jawabanmu di bawah dan kirim ulang. Tim kami akan
      meninjau lagi.
    </AlertDescription>
  </Alert>
{/if}

<div class="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:gap-10">
  <aside>
    <h2 class="font-heading text-lg font-semibold tracking-[-0.02em]">
      Yang kamu dapat
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
            Temanmu nggak harus langsung bayar. Konversi tetap jadi milikmu.
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
            Konversi, saldo, dan pembayaran tercatat otomatis di dashboard ini.
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
            disabled={submitting}
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
            disabled={submitting}
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
            disabled={submitting}
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
            disabled={submitting}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <p class="-mt-1 text-xs leading-relaxed text-muted-foreground">
      Kolom sosial opsional. Tapi akun yang aktif bikin aplikasimu lebih cepat
      dilirik.
    </p>

    <Alert variant="default">
      <HugeiconsIcon icon={Alert02Icon} />
      <AlertTitle>Data sosial hanya untuk skor</AlertTitle>
      <AlertDescription>
        Media sosial yang kamu isi hanya dipakai dalam proses penilaian
        aplikasi. Kamu tidak diwajibkan memakai akun tersebut untuk kegiatan
        afiliasi.
      </AlertDescription>
    </Alert>

    <Form.Button disabled={submitting}>
      {submitting ? "Mengirim..." : "Kirim aplikasi"}
    </Form.Button>
  </form>
</div>
