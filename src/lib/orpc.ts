import type { Router } from '$lib/server/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

declare global {
	var $client: RouterClient<Router> | undefined;
}

const link = new RPCLink({
	url: () => {
		if (typeof window === 'undefined') {
			throw new Error('RPCLink is not allowed on the server side.');
		}
		return `${window.location.origin}/rpc`;
	}
});

export const client: RouterClient<Router> = globalThis.$client ?? createORPCClient(link);
