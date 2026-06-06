<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';

	const { ref = $bindable(null), ...restProps }: DrawerPrimitive.TriggerProps = $props();
</script>

<DrawerPrimitive.Trigger bind:ref data-slot="drawer-trigger" {...restProps} />
