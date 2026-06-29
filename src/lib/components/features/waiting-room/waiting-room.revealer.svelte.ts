import type { ChunkSummaryItem } from "$lib/schemas/generate";
import { hash } from "$lib/utils/rng";

import type {
  GenerationItem,
  UnstampedGenerationItem,
} from "./waiting-room.types.ts";
import { capItems, flattenChunk } from "./waiting-room.utils.ts";

const DEFAULT_BASE_MS = 1500;

const randomDelay = (base: number): number =>
  base + Math.random() * (base * 0.4);

export interface ItemRevealer {
  readonly items: GenerationItem[];
  enqueue: (chunks: ChunkSummaryItem[], opts?: { since?: number }) => void;
  dispose: () => void;
}

export const createItemRevealer = ({
  initialChunks,
}: {
  initialChunks: ChunkSummaryItem[];
}): ItemRevealer => {
  let counter = 0;

  const stamp = (unstamped: UnstampedGenerationItem[]): GenerationItem[] =>
    unstamped.map((item): GenerationItem => {
      const stamped: GenerationItem = {
        ...item,
        id: hash(JSON.stringify(item.data) + counter),
      };
      counter += 1;
      return stamped;
    });

  let items = $state<GenerationItem[]>(
    capItems(stamp(initialChunks.flatMap(flattenChunk)).toReversed())
  );

  let pending: GenerationItem[] = [];
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  let draining = false;
  let currentBase = DEFAULT_BASE_MS;

  const pop = (): void => {
    drainTimer = null;
    const [next] = pending;
    if (next === undefined) {
      draining = false;
      return;
    }

    pending = pending.slice(1);
    items = capItems([next, ...items]);

    if (pending.length > 0) {
      drainTimer = setTimeout(pop, randomDelay(currentBase));
    } else {
      draining = false;
    }
  };

  const enqueue = (
    chunks: ChunkSummaryItem[],
    opts?: { since?: number }
  ): void => {
    const stamped = stamp(chunks.flatMap(flattenChunk));
    if (stamped.length === 0) {
      return;
    }

    const wasDraining = draining;
    pending = [...pending, ...stamped];

    if (!wasDraining) {
      if (opts?.since !== undefined) {
        currentBase = (Date.now() - opts.since) / pending.length;
      }
      draining = true;
      pop();
    }
  };

  const dispose = (): void => {
    if (drainTimer !== null) {
      clearTimeout(drainTimer);
      drainTimer = null;
    }
    draining = false;
  };

  return {
    dispose,
    enqueue,
    get items() {
      return items;
    },
  };
};
