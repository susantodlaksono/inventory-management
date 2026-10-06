import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { failureSimulation } from "@/lib/api/baseQuery";
import { server } from "./msw/server";

// next/image needs the Next.js runtime config; a plain <img> is enough in jsdom.
vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const imgProps: ImgHTMLAttributes<HTMLImageElement> = { ...props };
    delete (imgProps as { fill?: boolean }).fill;
    delete (imgProps as { priority?: boolean }).priority;
    return createElement("img", imgProps);
  },
}));

const originalRandom = failureSimulation.random;
const originalRate = failureSimulation.rate;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  // Deterministic by default: tests opt in to simulated failures explicitly.
  failureSimulation.rate = 0;
  failureSimulation.latencyMs = 0;
  window.scrollTo = vi.fn();
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
  window.localStorage.clear();
  failureSimulation.random = originalRandom;
  failureSimulation.rate = originalRate;
  vi.useRealTimers();
});
afterAll(() => server.close());
