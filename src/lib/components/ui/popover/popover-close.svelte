<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';

	const { ref = $bindable(null), ...restProps }: PopoverPrimitive.CloseProps = $props();
</script>

<PopoverPrimitive.Close bind:ref data-slot="popover-close" {...restProps} />
