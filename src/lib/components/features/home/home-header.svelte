<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    Agreement01Icon,
    Cancel01Icon,
    Dollar01Icon,
    InformationCircleIcon,
    InstagramIcon,
    LockIcon,
    Logout01Icon,
    PieChartIcon,
    Settings02Icon,
    Search02Icon,
    AiBeautifyIcon,
    QuillWrite01Icon,
  } from "$lib/components/features/icons";
  import UserAvatar from "$lib/components/features/users/user-avatar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import InputGroupAddon from "$lib/components/ui/input-group/input-group-addon.svelte";
  import InputGroupButton from "$lib/components/ui/input-group/input-group-button.svelte";
  import InputGroupInput from "$lib/components/ui/input-group/input-group-input.svelte";
  import InputGroup from "$lib/components/ui/input-group/input-group.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import { INSTAGRAM_URL } from "$lib/constants";
  import { authClient, getUser } from "$lib/hooks/auth.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let search = $state("");

  const user = getUser;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void goto("/login");
        },
      },
    });
  };
</script>

<div class="sticky top-0 z-20 bg-card text-card-foreground shadow-xs">
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    <div class="flex items-start gap-4">
      <UserAvatar
        name={user()?.name ?? ""}
        userId={user()?.id ?? ""}
        class="size-12"
      />
      <div class="">
        <span class="text-xs text-muted-foreground">Selamat belajar!</span>
        <h2 class="leading-tight font-semibold">
          {user()?.name ?? "Pengguna"}
        </h2>
      </div>
      <span class="flex-auto"></span>
      <div class="self-center">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                size="icon"
                variant="ghost"
                aria-label="Menu akun"
              >
                <HugeiconsIcon icon={Settings02Icon} />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="min-w-56">
            <DropdownMenu.Group>
              <DropdownMenu.Item onSelect={() => goto("/about")}>
                <HugeiconsIcon icon={InformationCircleIcon} />
                Tentang
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => goto("/privacy")}>
                <HugeiconsIcon icon={LockIcon} />
                Kebijakan Privasi
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => goto("/terms")}>
                <HugeiconsIcon icon={Agreement01Icon} />
                Syarat & Ketentuan
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => goto("/refund")}>
                <HugeiconsIcon icon={Dollar01Icon} />
                Kebijakan Pengembalian Dana
              </DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Item onSelect={() => goto("/subs/usage")}>
                <HugeiconsIcon icon={PieChartIcon} />
                Penggunaan
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() =>
                  window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")}
              >
                <HugeiconsIcon icon={InstagramIcon} />
                Bantuan (Instagram)
              </DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Item variant="destructive" onSelect={handleSignOut}>
              <HugeiconsIcon icon={Logout01Icon} />
              Keluar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
    <InputGroup>
      <InputGroupInput
        bind:value={search}
        placeholder="Cari modul belajar..."
      />
      <InputGroupAddon align="inline-start">
        <HugeiconsIcon icon={Search02Icon} />
      </InputGroupAddon>
      {#if search}
        <InputGroupButton onclick={() => (search = "")}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </InputGroupButton>
      {/if}
    </InputGroup>

    <ScrollArea class="w-full rounded-2xl" orientation="horizontal">
      <div class="flex flex-nowrap gap-2">
        <Button href="/study/generate">
          <HugeiconsIcon icon={AiBeautifyIcon} />
          Buat dengan AI
        </Button>
        <Button variant="outline" href="/study/new">
          <HugeiconsIcon icon={QuillWrite01Icon} />
          Buat manual
        </Button>
      </div>
    </ScrollArea>
  </div>
</div>
