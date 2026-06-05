import { tsNanoid } from '../utils/nanoid.ts';

export class SlugConflictError extends Error {
	constructor() {
		super('Failed to generate a unique slug after maximum retries');
		this.name = 'SlugConflictError';
	}
}

export function sanitize(title: string): string {
	const normalized = title.normalize('NFKD').replace(/\p{M}+/gu, '');
	return normalized
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const SLUG_MAX_RETRIES = 5;

export async function generateSlug(
	title: string,
	exists: (candidate: string) => Promise<boolean>
): Promise<string> {
	const sanitized = sanitize(title);
	const base = sanitized.length >= 5 ? `${sanitized}-` : '';
	let entropyLength = 12 - base.length;
	entropyLength = Math.max(8, entropyLength);
	entropyLength = Math.min(12, entropyLength);

	for (let attempt = 0; attempt < SLUG_MAX_RETRIES; attempt++) {
		const candidate = `${base}${tsNanoid(entropyLength)}`;
		if (!(await exists(candidate.toLowerCase()))) {
			return candidate;
		}
	}
	throw new SlugConflictError();
}
