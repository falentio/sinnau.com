import { customAlphabet } from "nanoid";
const alphanumeric = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphanumeric, 16);

function dayFragment(timestamp = Date.now()) {
    let day = Math.floor(timestamp / (1000 * 60 * 60 * 24));
    day *= 1337;
    day %= 36 ** 2
    day ^= 0b110100;
    return day.toString(36).padStart(2, "0");
}

export function generateId(prefix: string) {
    return `${prefix}_${dayFragment()}${nanoid()}`;
}