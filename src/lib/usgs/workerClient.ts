import type { QuakeQuery } from "./query";
import type { Earthquake } from "./schema";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

/**
 * Main-thread handle to the fetch/parse worker. Mirrors the `fetchEarthquakes`
 * contract — `(query, signal) → Promise<Earthquake[]>` — so callers (runQuery)
 * stay abort-aware and unaware of the worker. Import this module directly rather
 * than via the `@/lib/usgs` barrel, so unrelated barrel imports never spin up a
 * worker as a side effect.
 *
 * The worker is a lazily-created singleton; requests are multiplexed over it by
 * an incrementing id, and aborting a request posts a `cancel` so the worker can
 * stop the underlying fetch.
 */

interface Pending {
  resolve: (features: Earthquake[]) => void;
  reject: (reason: unknown) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as WorkerResponse;
    const entry = pending.get(message.id);
    if (!entry) return; // superseded/cancelled — already settled
    pending.delete(message.id);
    if (message.type === "success") entry.resolve(message.features);
    else entry.reject(new Error(message.message));
  };
  return worker;
}

/**
 * Fetch + parse earthquakes for `query` in the worker. Rejects with a
 * `DOMException("AbortError")` if `signal` aborts (superseded request), matching
 * `fetchEarthquakes` so runQuery's abort handling is unchanged.
 */
export function queryEarthquakes(query: QuakeQuery, signal?: AbortSignal): Promise<Earthquake[]> {
  const target = getWorker();
  const id = nextId++;

  return new Promise<Earthquake[]>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    pending.set(id, { resolve, reject });

    signal?.addEventListener(
      "abort",
      () => {
        if (!pending.delete(id)) return; // already settled
        target.postMessage({ type: "cancel", id } satisfies WorkerRequest);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );

    target.postMessage({ type: "query", id, query } satisfies WorkerRequest);
  });
}
