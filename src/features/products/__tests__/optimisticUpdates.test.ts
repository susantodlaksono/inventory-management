import { http, HttpResponse, delay } from "msw";
import { describe, expect, it } from "vitest";
import { failureSimulation } from "@/lib/api/baseQuery";
import { productsApi } from "@/lib/api/productsApi";
import { DEFAULT_FILTERS } from "@/lib/filters/types";
import { makeStore, type AppStore } from "@/store/store";
import { API } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import optimisticSlice, { rollbackAcknowledged, selectOptimisticEntry, selectPendingCount } from "../optimisticSlice";

async function storeWithCachedList(): Promise<AppStore> {
  const store = makeStore();
  await store.dispatch(productsApi.endpoints.getProducts.initiate(DEFAULT_FILTERS));
  await store.dispatch(productsApi.endpoints.getProduct.initiate(1));
  return store;
}

const listOf = (store: AppStore) => productsApi.endpoints.getProducts.select(DEFAULT_FILTERS)(store.getState()).data;
const detailOf = (store: AppStore, id: number) => productsApi.endpoints.getProduct.select(id)(store.getState()).data;

describe("optimistic delete", () => {
  it("removes the product from the cache before the request resolves and keeps it removed on success", async () => {
    server.use(
      http.delete(`${API}/products/:id`, async () => {
        await delay(30);
        return HttpResponse.json({ id: 1, title: "iPhone 15", price: 999, isDeleted: true, deletedOn: "now" });
      }),
    );
    const store = await storeWithCachedList();
    const request = store.dispatch(productsApi.endpoints.deleteProduct.initiate(1));

    expect(listOf(store)?.products.map((p) => p.id)).not.toContain(1);
    expect(listOf(store)?.total).toBe(5);
    expect(selectOptimisticEntry(store.getState(), 1)).toMatchObject({ kind: "delete", status: "pending" });
    expect(selectPendingCount(store.getState())).toBe(1);

    await request;
    expect(listOf(store)?.products.map((p) => p.id)).not.toContain(1);
    expect(selectOptimisticEntry(store.getState(), 1)).toBeUndefined();
    expect(store.getState().toasts.items.at(-1)).toMatchObject({ variant: "success" });
  });

  it("rolls back the cache, records the rollback and offers a retry when the request fails", async () => {
    server.use(http.delete(`${API}/products/:id`, () => HttpResponse.json({ message: "Server error" }, { status: 500 })));
    const store = await storeWithCachedList();
    const before = listOf(store);

    await store.dispatch(productsApi.endpoints.deleteProduct.initiate(1));

    expect(listOf(store)).toEqual(before);
    expect(selectOptimisticEntry(store.getState(), 1)).toMatchObject({ status: "rolledBack", error: "Server error" });
    const toast = store.getState().toasts.items.at(-1);
    expect(toast).toMatchObject({ variant: "error", retry: { endpoint: "deleteProduct", arg: 1 } });
  });

  it("rolls back when the simulated 20% failure triggers", async () => {
    const store = await storeWithCachedList();
    failureSimulation.rate = 0.2;
    failureSimulation.random = () => 0.05;
    await store.dispatch(productsApi.endpoints.deleteProduct.initiate(2));
    expect(listOf(store)?.products.map((p) => p.id)).toContain(2);
    expect(selectOptimisticEntry(store.getState(), 2)?.status).toBe("rolledBack");
  });
});

describe("optimistic update", () => {
  it("patches every cached entry and rolls all of them back on failure", async () => {
    server.use(
      http.put(`${API}/products/:id`, async () => {
        await delay(30);
        return HttpResponse.json({ message: "Conflict" }, { status: 409 });
      }),
    );
    const store = await storeWithCachedList();
    const request = store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 1, changes: { price: 1, title: "Cheap" } }));

    expect(listOf(store)?.products.find((p) => p.id === 1)).toMatchObject({ price: 1, title: "Cheap" });
    expect(detailOf(store, 1)).toMatchObject({ price: 1, title: "Cheap" });
    expect(selectOptimisticEntry(store.getState(), 1)).toMatchObject({ kind: "update", status: "pending" });

    await request;
    expect(listOf(store)?.products.find((p) => p.id === 1)).toMatchObject({ price: 999, title: "iPhone 15" });
    expect(detailOf(store, 1)).toMatchObject({ price: 999, title: "iPhone 15" });
    expect(selectOptimisticEntry(store.getState(), 1)).toMatchObject({ status: "rolledBack", error: "Conflict" });
    expect(store.getState().toasts.items.at(-1)?.retry).toEqual({
      endpoint: "updateProduct",
      arg: { id: 1, changes: { price: 1, title: "Cheap" } },
    });
  });

  it("keeps the patch and clears the entry on success", async () => {
    const store = await storeWithCachedList();
    await store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 1, changes: { stock: 77 } }));
    expect(listOf(store)?.products.find((p) => p.id === 1)?.stock).toBe(77);
    expect(selectOptimisticEntry(store.getState(), 1)).toBeUndefined();
  });

  it("succeeds on retry after a failure", async () => {
    const store = await storeWithCachedList();
    failureSimulation.rate = 1;
    await store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 3, changes: { stock: 1 } }));
    expect(selectOptimisticEntry(store.getState(), 3)?.status).toBe("rolledBack");

    failureSimulation.rate = 0;
    await store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 3, changes: { stock: 1 } }));
    expect(selectOptimisticEntry(store.getState(), 3)).toBeUndefined();
    expect(listOf(store)?.products.find((p) => p.id === 3)?.stock).toBe(1);
  });
});

describe("optimisticSlice bookkeeping", () => {
  it("ignores a stale rejection from an older request for the same product", async () => {
    let calls = 0;
    server.use(
      http.put(`${API}/products/:id`, async () => {
        calls += 1;
        if (calls === 1) {
          await delay(60);
          return HttpResponse.json({ message: "Timeout" }, { status: 504 });
        }
        return HttpResponse.json({ id: 4, title: "ThinkPad X1", price: 1, stock: 9 });
      }),
    );
    const store = await storeWithCachedList();
    const slow = store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 4, changes: { stock: 8 } }));
    const fast = store.dispatch(productsApi.endpoints.updateProduct.initiate({ id: 4, changes: { stock: 9 } }));

    await fast;
    expect(selectOptimisticEntry(store.getState(), 4)).toBeUndefined();
    await slow;
    // The late failure belongs to a superseded request and must not flag the product.
    expect(selectOptimisticEntry(store.getState(), 4)).toBeUndefined();
  });

  it("lets the UI acknowledge a rollback", () => {
    const state = {
      entries: { 7: { productId: 7, kind: "delete" as const, status: "rolledBack" as const, requestId: "r1" } },
    };
    expect(optimisticSlice.reducer(state, rollbackAcknowledged(7)).entries).toEqual({});
  });
});
