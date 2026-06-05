import { customAlphabet } from 'nanoid';
const alphanumeric = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const nanoid = customAlphabet(alphanumeric, 16);

export function dayFragment(timestamp = Date.now()) {
	let day = Math.floor(timestamp / (1000 * 60 * 60 * 24));
	day *= 1337;
	day %= 36 ** 2;
	day ^= 0b110100;
	return day.toString(36).padStart(2, '0');
}

export function tsNanoid(length: number) {
	if (length < 3) throw new Error('minimum tsNanoid length parameters are 3');
	return `${dayFragment()}${nanoid(length - 2)}`;
}

export function generateId(prefix: string) {
	return `${prefix}_${dayFragment()}${nanoid()}`;
}
