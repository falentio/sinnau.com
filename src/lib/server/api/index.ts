import { publicProcedure, authorizedProcedure, adminProcedure, requireAuth } from './base.ts';
import { studySetRouter } from '$lib/server/services/study-set/study-set.router';

export { publicProcedure, authorizedProcedure, adminProcedure, requireAuth };

export const router = {
	studySet: studySetRouter
};

export type Router = typeof router;
