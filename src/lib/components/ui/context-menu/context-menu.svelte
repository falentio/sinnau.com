<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

	const { open = $bindable(false), ...restProps }: ContextMenuPrimitive.RootProps = $props();
</script>

<ContextMenuPrimitive.Root bind:open {...restProps} />
