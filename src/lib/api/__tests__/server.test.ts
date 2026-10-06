import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { API } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { fetchProductById } from "../server";

vi.mock("server-only", () => ({}));

describe("fetchProductById (server)", () => {
  it("returns the product", async () => {
    expect((await fetchProductById(1))?.title).toBe("iPhone 15");
  });

  it("returns null for unknown products and malformed payloads", async () => {
    expect(await fetchProductById(999)).toBeNull();
    server.use(http.get(`${API}/products/:id`, () => HttpResponse.json({ unexpected: true })));
    expect(await fetchProductById(1)).toBeNull();
  });

  it("throws on server errors so the error boundary can render", async () => {
    server.use(http.get(`${API}/products/:id`, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchProductById(1)).rejects.toThrow("status 500");
  });
});
