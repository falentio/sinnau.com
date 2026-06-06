<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

	const { open = $bindable(false), ...restProps }: ContextMenuPrimitive.SubProps = $props();
</script>

<ContextMenuPrimitive.Sub bind:open {...restProps} />
