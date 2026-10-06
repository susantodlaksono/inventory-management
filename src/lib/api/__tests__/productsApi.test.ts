import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { productsApi } from "@/lib/api/productsApi";
import { DEFAULT_FILTERS } from "@/lib/filters/types";
import { makeStore } from "@/store/store";
import { API } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

describe("productsApi queries", () => {
  it("fetches the first page of products", async () => {
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProducts.initiate(DEFAULT_FILTERS));
    expect(result.data?.products).toHaveLength(6);
    expect(result.data?.total).toBe(6);
  });

  it("sends search, sort and paging params to the search endpoint", async () => {
    let requested: URL | undefined;
    server.use(
      http.get(`${API}/products/search`, ({ request }) => {
        requested = new URL(request.url);
        return HttpResponse.json({ products: [], total: 0, skip: 10, limit: 10 });
      }),
    );
    const store = makeStore();
    await store.dispatch(productsApi.endpoints.getProducts.initiate({ ...DEFAULT_FILTERS, search: "phone", sort: "price_desc", page: 2 }));
    expect(Object.fromEntries(requested?.searchParams ?? [])).toMatchObject({
      q: "phone",
      sortBy: "price",
      order: "desc",
      limit: "10",
      skip: "10",
    });
  });

  it("combines search and category on the client", async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProducts.initiate({ ...DEFAULT_FILTERS, search: "phone", category: "laptops" }),
    );
    expect(result.data?.products.map((p) => p.title)).toEqual(["Phone Stand"]);
    expect(result.data?.total).toBe(1);
  });

  it("filters by category through the category endpoint", async () => {
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProducts.initiate({ ...DEFAULT_FILTERS, category: "laptops" }));
    expect(result.data?.products.every((p) => p.category === "laptops")).toBe(true);
  });

  it("rejects malformed list responses", async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.json({ items: [] })));
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProducts.initiate(DEFAULT_FILTERS));
    expect(result.error).toMatchObject({ status: "PARSING_ERROR" });
  });

  it("surfaces HTTP errors", async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.json({ message: "Down" }, { status: 503 })));
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getProducts.initiate(DEFAULT_FILTERS));
    expect(result.error).toMatchObject({ status: 503 });
  });

  it("loads categories and drops malformed entries", async () => {
    server.use(http.get(`${API}/products/categories`, () => HttpResponse.json([{ slug: "a", name: "A", url: "" }, "bad"])));
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getCategories.initiate());
    expect(result.data).toEqual([{ slug: "a", name: "A", url: "" }]);
  });

  it("returns an empty category list for a non-array response", async () => {
    server.use(http.get(`${API}/products/categories`, () => HttpResponse.json({})));
    const store = makeStore();
    const result = await store.dispatch(productsApi.endpoints.getCategories.initiate());
    expect(result.data).toEqual([]);
  });

  it("loads a single product and handles 404 / malformed responses", async () => {
    const store = makeStore();
    expect((await store.dispatch(productsApi.endpoints.getProduct.initiate(3))).data?.title).toBe("MacBook Air");
    expect((await store.dispatch(productsApi.endpoints.getProduct.initiate(999))).error).toMatchObject({ status: 404 });
    server.use(http.get(`${API}/products/:id`, () => HttpResponse.json({ nope: true })));
    expect((await store.dispatch(productsApi.endpoints.getProduct.initiate(4))).error).toMatchObject({ status: "PARSING_ERROR" });
  });
});
