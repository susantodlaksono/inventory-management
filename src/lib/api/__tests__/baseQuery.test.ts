import { describe, expect, it } from "vitest";
import { productsApi } from "@/lib/api/productsApi";
import { makeStore } from "@/store/store";
import { SIMULATED_FAILURE_MESSAGE, failureSimulation, getRequestMethod, shouldSimulateFailure } from "../baseQuery";

describe("failure simulation", () => {
  const config = { rate: 0.2, methods: ["PUT", "DELETE"], random: () => 0.1, latencyMs: 0 };

  it("only targets configured write methods", () => {
    expect(shouldSimulateFailure("DELETE", config)).toBe(true);
    expect(shouldSimulateFailure("put", config)).toBe(true);
    expect(shouldSimulateFailure("GET", config)).toBe(false);
    expect(shouldSimulateFailure("POST", config)).toBe(false);
  });

  it("fails roughly `rate` of the time based on the random source", () => {
    expect(shouldSimulateFailure("DELETE", { ...config, random: () => 0.19 })).toBe(true);
    expect(shouldSimulateFailure("DELETE", { ...config, random: () => 0.2 })).toBe(false);
    expect(shouldSimulateFailure("DELETE", { ...config, rate: 0 })).toBe(false);
  });

  it("derives the request method", () => {
    expect(getRequestMethod("/products")).toBe("GET");
    expect(getRequestMethod({ url: "/products/1" })).toBe("GET");
    expect(getRequestMethod({ url: "/products/1", method: "delete" })).toBe("DELETE");
  });

  it("returns a FETCH_ERROR without hitting the network when triggered", async () => {
    failureSimulation.rate = 1;
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.deleteProduct.initiate(1));
    expect(result.error).toEqual({ status: "FETCH_ERROR", error: SIMULATED_FAILURE_MESSAGE });
  });
});
