import { AsyncLocalStorage } from "node:async_hooks";

// oxlint-disable-next-line typescript/no-namespace
export declare namespace WideEventStorage {
  export type WideEventData = Record<string, unknown>;
}

export const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (
        !target[key] ||
        typeof target[key] !== "object" ||
        Array.isArray(target[key])
      ) {
        target[key] = {};
      }
      deepMerge(
        target[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
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
    if (!key) {
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
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }
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
    return this.storage.getStore() ?? {};
  }
}

export const wideEventStorage = new WideEventStorage();
