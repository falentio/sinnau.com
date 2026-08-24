<script lang="ts">
  interface Props {
    class?: string;
    size?: "sm" | "md";
  }
  let { class: className = "", size = "md" }: Props = $props();
</script>

<a
  href="/"
  class={[
    "group inline-flex items-center gap-2 font-display tracking-tight",
    size === "md" ? "text-[15px]" : "text-[13px]",
    className,
  ]}
  aria-label="sinnau, beranda"
>
  <img
    src="/favicon.jpg"
    alt=""
    aria-hidden="true"
    width="24"
    height="24"
    class="size-6 rounded-[8px]"
  />
  <span class="text-[var(--landing-fg)]">sinnau</span>
</a>
