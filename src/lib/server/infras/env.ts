import { env as privateEnv } from '$env/dynamic/private';

function read(key: string): string | undefined {
	const value = privateEnv[key];
	if (value === undefined || value === '') return undefined;
	return value;
}

function required(key: string): string {
	const value = read(key);
	if (value === undefined) {
		throw new Error(`Missing required env var: ${key}`);
	}
	return value;
}

export const env = {
	BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
	BETTER_AUTH_URL: required('BETTER_AUTH_URL'),
	DB_FILE_NAME: read('DB_FILE_NAME') ?? '.data/data.db'
} as const;

export type Env = typeof env;
