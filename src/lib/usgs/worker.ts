/**
 * Dedicated module worker: runs the USGS fetch + Zod parse off the main thread
 * so large responses never jank the UI. It reuses the framework-free data layer
 * verbatim (`fetchEarthquakes`, `toErrorMessage`) — no duplicated logic.
 *
 * Protocol (see `workerProtocol.ts`):
 *  - `query`  → fetch + parse, then post the features back (in USGS order).
 *  - `cancel` → abort the in-flight fetch for that id.
 *
 * Errors are mapped to a user-facing string HERE, because `UsgsRequestError` /
 * `ZodError` / `TypeError` lose their prototypes across `postMessage`
 * (structured clone), so `instanceof` only works on the side that threw.
 *
 * A sort/filter step would slot in right before posting `success`; per current
 * requirements we return features untouched, in the order USGS sent them.
 */
import { toErrorMessage } from "./errors";
import { fetchEarthquakes } from "./query";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

/** In-flight fetches by request id, so `cancel` can abort the right one. */
const controllers = new Map<number, AbortController>();

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent) => {
  const message = event.data as WorkerRequest;

  if (message.type === "cancel") {
    controllers.get(message.id)?.abort();
    controllers.delete(message.id);
    return;
  }

  const { id, query } = message;
  const controller = new AbortController();
  controllers.set(id, controller);

  fetchEarthquakes(query, controller.signal)
    .then((collection) => {
      if (controller.signal.aborted) return; // superseded — stay silent
      post({ type: "success", id, features: collection.features });
    })
    .catch((err: unknown) => {
      if (controller.signal.aborted) return; // cancelled — the client already rejected
      post({ type: "error", id, message: toErrorMessage(err) });
    })
    .finally(() => {
      controllers.delete(id);
    });
};
