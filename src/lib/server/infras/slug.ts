const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

export class SlugConflictError extends Error {
	constructor() {
		super('Failed to generate a unique slug after maximum retries');
		this.name = 'SlugConflictError';
	}
}

function randomBase32(length: number): string {
	let out = '';
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	for (let i = 0; i < length; i++) {
		const byte = bytes[i] ?? 0;
		out += BASE32_ALPHABET[byte % BASE32_ALPHABET.length];
	}
	return out;
}

function sanitize(title: string): string {
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
	const maxEntropy = sanitized.length >= 5 ? 6 : 12;

	for (let attempt = 0; attempt < SLUG_MAX_RETRIES; attempt++) {
		const candidate = `${base}${randomBase32(maxEntropy)}`;
		if (!(await exists(candidate.toLowerCase()))) {
			return candidate;
		}
	}
	throw new SlugConflictError();
}
