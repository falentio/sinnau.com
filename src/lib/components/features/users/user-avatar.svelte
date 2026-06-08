<script lang="ts">
  import AvatarFallback from "$lib/components/ui/avatar/avatar-fallback.svelte";
  import AvatarImage from "$lib/components/ui/avatar/avatar-image.svelte";
  import Avatar from "$lib/components/ui/avatar/avatar.svelte";
  import { cn } from "$lib/utils.js";

  let {
    name,
    userId,
    class: className,
  }: {
    name: string;
    userId: string;
    class?: string;
  } = $props();

  const initials = $derived(
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "U"
  );
</script>

<Avatar class={cn(className)} data-user-id={userId}>
  <AvatarImage
    src="https://api.dicebear.com/10.x/lorelei-neutral/svg?seed={userId}"
  />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
