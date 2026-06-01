import { ORPCError } from '@orpc/server';
import { base } from '../context.ts';

export const requireAuth = base.middleware(async ({ context, next }) => {
	if (!context.session || !context.user) {
		throw new ORPCError('UNAUTHORIZED');
	}
	return next({
		context: {
			session: context.session,
			user: context.user
		}
	});
});
