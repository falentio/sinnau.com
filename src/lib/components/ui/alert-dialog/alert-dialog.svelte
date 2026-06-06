<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	const { open = $bindable(false), ...restProps }: AlertDialogPrimitive.RootProps = $props();
</script>

<AlertDialogPrimitive.Root bind:open {...restProps} />
