import { auth } from '$lib/server/infras/auth';

const handler = auth.handler;
export const GET = handler;
export const POST = handler;
