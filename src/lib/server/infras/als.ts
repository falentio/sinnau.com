import { AsyncLocalStorage } from "node:async_hooks";

import { dev } from "$app/env";

// oxlint-disable-next-line typescript/no-namespace
export declare namespace WideEventStorage {
  export type WideEventData = Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (isRecord(value)) {
      if (!isRecord(target[key])) {
        target[key] = {};
      }
      const merged = target[key];
      if (isRecord(merged)) {
        deepMerge(merged, value);
      }
    } else {
      target[key] = value;
    }
  }
  return target;
};

export const pushToNestedObject = (
  target: Record<string, unknown>,
  keys: string[],
  value: unknown
): void => {
  let current = target;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === null || key === undefined || key === "") {
      throw new Error("Key cannot be empty");
    }
    if (i === keys.length - 1) {
      if (!Array.isArray(current[key])) {
        current[key] = [];
      }
      if (!Array.isArray(current[key])) {
        throw new TypeError(`Expected an array at key: ${key}`);
      }
      current[key].push(value);
    } else {
      if (!isRecord(current[key])) {
        current[key] = {};
      }
      const next = current[key];
      if (isRecord(next)) {
        current = next;
      }
    }
  }
};

const toSortedObject = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const sortedKeys = Object.keys(obj).toSorted();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const value = obj[key];
    if (isRecord(value)) {
      sortedObj[key] = toSortedObject(value);
      continue;
    }

    sortedObj[key] = value;
  }
  return sortedObj;
};

export class WideEventStorage {
  private readonly storage =
    new AsyncLocalStorage<WideEventStorage.WideEventData>();

  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  run<T>(data: WideEventStorage.WideEventData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  update(updateFn: (data: WideEventStorage.WideEventData) => void): void {
    const currentData = this.storage.getStore() ?? {};
    updateFn(currentData);
    this.storage.enterWith(currentData);
  }

  assign(newData: WideEventStorage.WideEventData): void {
    this.update((currentData) => {
      deepMerge(currentData, newData);
    });
  }

  push(keys: string[], value: unknown) {
    const currentData = this.storage.getStore() ?? {};
    pushToNestedObject(currentData, keys, value);
    this.storage.enterWith(currentData);
  }

  get() {
    const value = this.storage.getStore() ?? {};
    if (!dev) {
      return value;
    }

    return toSortedObject(value);
  }
}

export const wideEventStorage = new WideEventStorage();
