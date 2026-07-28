<script lang="ts">
  import {
    Alert02Icon,
    BankIcon,
    CheckmarkCircle02Icon,
    Wallet01Icon,
  } from "$lib/components/features/icons";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type {
    AffiliatePayoutFormData,
    AffiliatePayoutFormObject,
  } from "./create-payout-form.svelte";

  let {
    enhance,
    errors,
    form,
    formData,
    hasAccount = false,
    minimumPayoutLabel,
    submitting = false,
  }: {
    enhance: (formElement: HTMLFormElement) => { destroy: () => void };
    errors: AffiliatePayoutFormObject["errors"];
    form: AffiliatePayoutFormObject;
    formData: AffiliatePayoutFormData;
    hasAccount?: boolean;
    minimumPayoutLabel: string;
    submitting?: boolean;
  } = $props();

  const isBank = $derived($formData.method === "BANK");

  const accountNumberLabel = $derived(
    isBank ? "Nomor rekening" : "Nomor Gopay"
  );

  const accountNumberPlaceholder = $derived(
    isBank ? "Contoh: 1234567890" : "Contoh: 081234567890"
  );

  const handleMethodChange = (value: string | null | undefined) => {
    if (value !== "GOPAY" && value !== "BANK") {
      return;
    }
    $formData.method = value;
    if (value === "GOPAY") {
      $formData.bankName = "";
    }
  };

  const rootErrors = $derived($errors._errors ?? []);
</script>

<section class="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300"
      >
        Rekening payout
      </span>
      <p class="text-sm text-muted-foreground">
        Komisi yang dicairkan akan dikirim ke sini. Pastikan datanya benar.
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2.5">
      {#if hasAccount}
        <span
          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} class="size-3" />
          Tersimpan
        </span>
      {/if}
      <div
        class="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
      >
        <HugeiconsIcon icon={isBank ? BankIcon : Wallet01Icon} class="size-4" />
      </div>
    </div>
  </div>

  <form method="POST" novalidate use:enhance class="mt-5 flex flex-col gap-5">
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">Metode pencairan</span>
      <ToggleGroup.Root
        type="single"
        variant="outline"
        value={$formData.method}
        onValueChange={handleMethodChange}
        disabled={submitting}
        class="w-full"
      >
        <ToggleGroup.Item value="GOPAY" class="flex-1">
          <HugeiconsIcon icon={Wallet01Icon} data-icon="inline-start" />
          Gopay
        </ToggleGroup.Item>
        <ToggleGroup.Item value="BANK" class="flex-1">
          <HugeiconsIcon icon={BankIcon} data-icon="inline-start" />
          Bank
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>

    {#if isBank}
      <Form.Field {form} name="bankName">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Nama bank</Form.Label>
            <Input
              {...props}
              bind:value={$formData.bankName}
              placeholder="Contoh: BCA, Mandiri, BRI"
              disabled={submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
    {/if}

    <Form.Field {form} name="accountNumber">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>{accountNumberLabel}</Form.Label>
          <Input
            {...props}
            bind:value={$formData.accountNumber}
            placeholder={accountNumberPlaceholder}
            inputmode="numeric"
            autocomplete="off"
            disabled={submitting}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="accountHolderName">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Nama pemilik rekening</Form.Label>
          <Input
            {...props}
            bind:value={$formData.accountHolderName}
            placeholder="Sesuai buku tabungan / akun Gopay"
            disabled={submitting}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="whatsappNumber">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Nomor WhatsApp</Form.Label>
          <Input
            {...props}
            bind:value={$formData.whatsappNumber}
            placeholder="Contoh: 081234567890"
            inputmode="tel"
            autocomplete="tel"
            disabled={submitting}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    {#if rootErrors.length > 0}
      <div class="flex flex-col gap-1">
        {#each rootErrors as error (error)}
          <p class="text-sm font-medium text-destructive">{error}</p>
        {/each}
      </div>
    {/if}

    <Alert variant="default">
      <HugeiconsIcon icon={Alert02Icon} />
      <AlertTitle>Jadwal pencairan</AlertTitle>
      <AlertDescription>
        Pencairan dilakukan setiap hari Jumat, minimal {minimumPayoutLabel}.
        Data bisa diubah kapan pun sebelum pencairan berikutnya.
      </AlertDescription>
    </Alert>

    <div class="flex items-center justify-end gap-3">
      <Form.Button disabled={submitting} class="shrink-0">
        {submitting ? "Menyimpan..." : hasAccount ? "Perbarui" : "Simpan"}
      </Form.Button>
    </div>
  </form>
</section>
