import { createApi } from "@reduxjs/toolkit/query/react";
import type { Draft } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { applyClientSidePaging, buildProductsRequest } from "@/lib/filters/productQuery";
import type { ProductFilters } from "@/lib/filters/types";
import { baseQueryWithFailureSimulation } from "./baseQuery";
import { isCategory, isProduct, isProductsResponse } from "./guards";
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

    /**
     * Optimistic update: patch every cached list + detail entry immediately and undo
     * the patches if the request fails. DummyJSON does not persist writes, so we do not
     * invalidate on success (a refetch would revert to the server's original data).
     */
    updateProduct: build.mutation<Product, UpdateProductArg>({
      query: ({ id, changes }) => ({ url: `/products/${id}`, method: "PUT", body: changes }),
      async onQueryStarted({ id, changes }, { dispatch, getState, queryFulfilled }) {
        const applyChanges = (product: Draft<Product>) => {
          Object.assign(product, changes);
        };
        const patches = productsApi.util
          .selectCachedArgsForQuery(getState(), "getProducts")
          .map((args) =>
            dispatch(
              productsApi.util.updateQueryData("getProducts", args, (draft) => {
                const product = draft.products.find((item) => item.id === id);
                if (product) applyChanges(product);
              }),
            ),
          );
        patches.push(
          dispatch(
            productsApi.util.updateQueryData("getProduct", id, (draft) => {
              applyChanges(draft);
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),

    deleteProduct: build.mutation<DeleteProductResponse, number>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const patches = productsApi.util
          .selectCachedArgsForQuery(getState(), "getProducts")
          .map((args) =>
            dispatch(
              productsApi.util.updateQueryData("getProducts", args, (draft) => {
                const index = draft.products.findIndex((item) => item.id === id);
                if (index !== -1) {
                  draft.products.splice(index, 1);
                  draft.total = Math.max(0, draft.total - 1);
                }
              }),
            ),
          );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetProductQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
