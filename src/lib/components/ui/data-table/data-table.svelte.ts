import { createTable } from "@tanstack/table-core";
import type {
  RowData,
  TableOptions,
  TableOptionsResolved,
  TableState,
  Updater,
} from "@tanstack/table-core";

type MaybeThunk<T extends object> = T | (() => T | null | undefined);
type Intersection<T extends readonly unknown[]> = T extends [
  infer H,
  ...infer R,
]
  ? H & Intersection<R>
  : unknown;

/**
 * Lazily merges several objects (or thunks) while preserving
 * getter semantics from every source.
 *
 * Proxy-based to avoid known WebKit recursion issue.
 */
const resolveThunk = <T extends object>(src: MaybeThunk<T>): T | undefined =>
  typeof src === "function" ? (src() ?? undefined) : src;

// oxlint-disable-next-line no-explicit-any
export const mergeObjects = <Sources extends readonly MaybeThunk<any>[]>(
  ...sources: Sources
): Intersection<{ [K in keyof Sources]: Sources[K] }> => {
  // oxlint-disable no-unsafe-assignment, no-unsafe-return, no-unsafe-member-access, no-unsafe-argument, no-unsafe-call, no-unsafe-type-assertion, no-useless-undefined, strict-boolean-expressions, no-unnecessary-type-assertion
  const findSourceWithKey = (key: PropertyKey) => {
    for (let i = sources.length - 1; i >= 0; i -= 1) {
      const obj = resolveThunk(sources[i]);
      if (obj && key in obj) {
        return obj;
      }
    }
    return undefined;
  };

  return new Proxy(Object.create(null), {
    get(_, key) {
      const src = findSourceWithKey(key);
      return src?.[key as never];
    },

    getOwnPropertyDescriptor(_, key) {
      const src = findSourceWithKey(key);
      if (!src) {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        // oxlint-disable-next-line no-explicit-any
        value: (src as any)[key],
        writable: true,
      };
    },

    has(_, key) {
      return !!findSourceWithKey(key);
    },

    ownKeys(): (string | symbol)[] {
      const all = new Set<string | symbol>();
      for (const s of sources) {
        const obj = resolveThunk(s);
        if (obj) {
          for (const k of Reflect.ownKeys(obj)) {
            all.add(k);
          }
        }
      }
      return [...all];
    },
  }) as Intersection<{ [K in keyof Sources]: Sources[K] }>;
  // oxlint-enable no-unsafe-assignment, no-unsafe-return, no-unsafe-member-access, no-unsafe-argument, no-unsafe-call, no-unsafe-type-assertion, no-useless-undefined, strict-boolean-expressions, no-unnecessary-type-assertion
};

/**
 * Creates a reactive TanStack table object for Svelte.
 * @param options Table options to create the table with.
 * @returns A reactive table object.
 * @example
 * ```svelte
 * <script>
 *   const table = createSvelteTable({ ... })
 * </script>
 *
 * <table>
 *   <thead>
 *     {#each table.getHeaderGroups() as headerGroup}
 *       <tr>
 *         {#each headerGroup.headers as header}
 *           <th colspan={header.colSpan}>
 *         	   <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
 *         	 </th>
 *         {/each}
 *       </tr>
 *     {/each}
 *   </thead>
 * 	 <!-- ... -->
 * </table>
 * ```
 */
export const createSvelteTable = <TData extends RowData>(
  options: TableOptions<TData>
) => {
  const resolvedOptions: TableOptionsResolved<TData> = mergeObjects(
    {
      mergeOptions: (
        defaultOptions: TableOptions<TData>,
        overrides: Partial<TableOptions<TData>>
      ) => mergeObjects(defaultOptions, overrides),
      onStateChange: () => {
        // no-op default; replaced by user options
      },
      renderFallbackValue: null,
      state: {},
    },
    options
  );

  const table = createTable(resolvedOptions);
  let state = $state<TableState>(table.initialState);

  const updateOptions = () => {
    table.setOptions(() =>
      mergeObjects(resolvedOptions, options, {
        onStateChange: (updater: Updater<TableState>) => {
          state =
            typeof updater === "function"
              ? updater(state)
              : mergeObjects(state, updater);

          options.onStateChange?.(updater);
        },

        state: mergeObjects(state, options.state ?? {}),
      })
    );
  };

  updateOptions();

  $effect.pre(() => {
    updateOptions();
  });

  return table;
};
