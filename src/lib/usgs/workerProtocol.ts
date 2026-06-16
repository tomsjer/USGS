import type { QuakeQuery } from "./query";
import type { Earthquake } from "./schema";

/**
 * Message contracts for the USGS fetch/parse worker (see `worker.ts` and
 * `workerClient.ts`). Type-only — no runtime — so both the main thread and the
 * worker can share them without either side importing the other's code.
 *
 * Every request carries an incrementing `id` so the client can match responses
 * to callers and ignore/replace superseded ones; `cancel` aborts an in-flight
 * fetch by id.
 */

export interface QueryRequest {
  type: "query";
  id: number;
  query: QuakeQuery;
}

export interface CancelRequest {
  type: "cancel";
  id: number;
}

export type WorkerRequest = QueryRequest | CancelRequest;

export interface QuerySuccess {
  type: "success";
  id: number;
  features: Earthquake[];
}

export interface QueryFailure {
  type: "error";
  id: number;
  /** Already user-facing: mapped worker-side via `toErrorMessage`. */
  message: string;
}

export type WorkerResponse = QuerySuccess | QueryFailure;
