import { AsyncLocalStorage } from "node:async_hooks";

// oxlint-disable-next-line typescript/no-namespace
export declare namespace WideEventStorage {
  export type WideEventData = Record<string, unknown>;
}

export class WideEventStorage {
  private storage = new AsyncLocalStorage<WideEventStorage.WideEventData>();

  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  run<T>(data: WideEventStorage.WideEventData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  update(updateFn: (data: WideEventStorage.WideEventData) => void): void {
    console.log("Updating wide event storage data...");
    const currentData = this.storage.getStore() ?? {};
    updateFn(currentData);
    this.storage.enterWith(currentData);
  }

  assign(newData: WideEventStorage.WideEventData): void {
    this.update((currentData) => {
      Object.assign(currentData, newData);
    });
  }

  get() {
    return this.storage.getStore() ?? {};
  }
}

export const wideEventStorage = new WideEventStorage();
