import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";

export const API_BASE_URL = "https://dummyjson.com";

export const SIMULATED_FAILURE_MESSAGE = "Simulated network failure. Your change was rolled back.";

function parseRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export interface FailureSimulationConfig {
  /** Probability (0..1) that a write request fails. */
  rate: number;
  /** HTTP methods affected by the simulation. */
  methods: readonly string[];
  /** Random source, injectable for deterministic tests. */
  random: () => number;
  /** Artificial latency applied to simulated failures (ms). */
  latencyMs: number;
}

export const failureSimulation: FailureSimulationConfig = {
  rate: parseRate(process.env.NEXT_PUBLIC_SIMULATED_FAILURE_RATE, 0.2),
  methods: ["PUT", "PATCH", "DELETE"],
  random: Math.random,
  latencyMs: 600,
};

export function getRequestMethod(args: string | FetchArgs): string {
  return typeof args === "string" ? "GET" : (args.method ?? "GET").toUpperCase();
}

export function shouldSimulateFailure(method: string, config: FailureSimulationConfig = failureSimulation): boolean {
  return config.methods.includes(method.toUpperCase()) && config.random() < config.rate;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

/**
 * Wraps fetchBaseQuery and injects a configurable failure rate on write requests
 * (20% by default) so optimistic rollback paths can be exercised against a mock API.
 */
export const baseQueryWithFailureSimulation: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const method = getRequestMethod(args);
  if (shouldSimulateFailure(method)) {
    await wait(failureSimulation.latencyMs, api.signal);
    return { error: { status: "FETCH_ERROR", error: SIMULATED_FAILURE_MESSAGE } };
  }
  return rawBaseQuery(args, api, extraOptions);
};
