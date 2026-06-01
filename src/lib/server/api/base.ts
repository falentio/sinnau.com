import { ORPCError } from '@orpc/server';
import { base } from './context.ts';
import { requireAuth } from './middlewares/auth.ts';

export { requireAuth };

export const publicProcedure = base;

export const authorizedProcedure = base.use(requireAuth);

export const adminProcedure = authorizedProcedure.use(async ({ context, next }) => {
	if (context.user.role !== 'admin') {
		throw new ORPCError('FORBIDDEN', { message: 'Admin access required' });
	}
	return next();
});
