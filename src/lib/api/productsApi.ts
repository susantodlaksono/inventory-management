import { createApi } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { applyClientSidePaging, buildProductsRequest } from "@/lib/filters/productQuery";
import type { ProductFilters } from "@/lib/filters/types";
import { baseQueryWithFailureSimulation } from "./baseQuery";
import { isCategory, isProduct, isProductsResponse } from "./guards";
import { beginOptimisticChange, type ProductChange } from "./optimisticJournal";
import { serializeFilters } from "@/lib/filters/urlState";
import type {
  Category,
  CreatedProduct,
  CreateProductPayload,
  DeleteProductResponse,
  Product,
  ProductsResponse,
  UpdateProductArg,
} from "./types";

function invalidResponse(endpoint: string): FetchBaseQueryError {
  return { status: "PARSING_ERROR", originalStatus: 200, data: "", error: `Unexpected response shape from ${endpoint}` };
}

export const productsApi = createApi({
  reducerPath: "productsApi",
  baseQuery: baseQueryWithFailureSimulation,
  tagTypes: ["Product", "Categories"],
  keepUnusedDataFor: 120,
  endpoints: (build) => ({
    getProducts: build.query<ProductsResponse, ProductFilters>({
      async queryFn(filters, _api, _extraOptions, baseQuery) {
        const request = buildProductsRequest(filters);
        const result = await baseQuery({ url: request.url, params: request.params });
        if (result.error) return { error: result.error };
        if (!isProductsResponse(result.data)) return { error: invalidResponse(request.url) };
        return { data: request.clientSidePaging ? applyClientSidePaging(result.data, filters) : result.data };
      },
      providesTags: (result) =>
        result
          ? [...result.products.map(({ id }) => ({ type: "Product" as const, id })), { type: "Product", id: "LIST" }]
          : [{ type: "Product", id: "LIST" }],
    }),

    getCategories: build.query<Category[], void>({
      query: () => "/products/categories",
      transformResponse: (response: unknown) => (Array.isArray(response) ? response.filter(isCategory) : []),
      providesTags: ["Categories"],
      keepUnusedDataFor: 60 * 60,
    }),

    getProduct: build.query<Product, number>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const result = await baseQuery(`/products/${id}`);
        if (result.error) return { error: result.error };
        if (!isProduct(result.data)) return { error: invalidResponse(`/products/${id}`) };
        return { data: result.data };
      },
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),

    addProduct: build.mutation<CreatedProduct, CreateProductPayload>({
      query: (body) => ({ url: "/products/add", method: "POST", body }),
    }),

    // DummyJSON does not persist writes: preserve successful client changes
    // without refetching the unchanged server data.
    updateProduct: build.mutation<Product, UpdateProductArg>({
      query: ({ id, changes }) => ({ url: `/products/${id}`, method: "PUT", body: changes }),
      async onQueryStarted({ id, changes }, { dispatch, getState, queryFulfilled }) {
        const settle = beginProductChange({ kind: "update", id, changes }, { dispatch, getState });
        try {
          await queryFulfilled;
          settle(true);
        } catch {
          settle(false);
        }
      },
    }),

    deleteProduct: build.mutation<DeleteProductResponse, number>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const settle = beginProductChange({ kind: "delete", id }, { dispatch, getState });
        try {
          await queryFulfilled;
          settle(true);
        } catch {
          settle(false);
        }
      },
    }),
  }),
});

function beginProductChange(change: ProductChange, { dispatch, getState }: Pick<BaseQueryApi, "dispatch" | "getState">) {
  // BaseQueryApi exposes unknown state; these callbacks run in the store that
  // installs this API reducer and middleware.
  const state = getState() as { productsApi: ReturnType<typeof productsApi.reducer> };
  const settlements: Array<(succeeded: boolean) => void> = [];
  for (const args of productsApi.util.selectCachedArgsForQuery(state, "getProducts")) {
    const snapshot = productsApi.endpoints.getProducts.select(args)(state).data;
    if (!snapshot) continue;
    settlements.push(beginOptimisticChange(getState, `list:${serializeFilters(args)}`, change, (changes) => {
      dispatch(productsApi.util.updateQueryData("getProducts", args, (draft) => {
        draft.products = snapshot.products.map((product) => ({ ...product }));
        draft.total = snapshot.total;
        for (const operation of changes) {
          const index = draft.products.findIndex((product) => product.id === operation.id);
          if (index === -1) continue;
          if (operation.kind === "update") Object.assign(draft.products[index], operation.changes);
          else {
            draft.products.splice(index, 1);
            draft.total = Math.max(0, draft.total - 1);
          }
        }
      }));
    }));
  }
  if (change.kind === "update") {
    const snapshot = productsApi.endpoints.getProduct.select(change.id)(state).data;
    if (snapshot) {
      settlements.push(beginOptimisticChange(getState, `detail:${change.id}`, change, (changes) => {
        dispatch(productsApi.util.updateQueryData("getProduct", change.id, (draft) => {
          Object.assign(draft, snapshot);
          for (const operation of changes) {
            if (operation.kind === "update") Object.assign(draft, operation.changes);
          }
        }));
      }));
    }
  }
  return (succeeded: boolean) => settlements.forEach((settle) => settle(succeeded));
}

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetProductQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
