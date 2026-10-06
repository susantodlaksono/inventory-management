import { delay, http, HttpResponse } from "msw";
import type { Product, ProductsResponse } from "@/lib/api/types";
import { categoriesFixture, productsFixture } from "../fixtures";

export const API = "https://dummyjson.com";

function sortProducts(products: Product[], url: URL): Product[] {
  const sortBy = url.searchParams.get("sortBy") as keyof Product | null;
  if (!sortBy) return products;
  const direction = url.searchParams.get("order") === "desc" ? -1 : 1;
  return [...products].sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
    return String(left).localeCompare(String(right)) * direction;
  });
}

/** Applies DummyJSON's limit/skip semantics (limit=0 means "everything"). */
export function paginate(products: Product[], url: URL): ProductsResponse {
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const skip = Number(url.searchParams.get("skip") ?? 0);
  const sorted = sortProducts(products, url);
  return {
    products: limit === 0 ? sorted.slice(skip) : sorted.slice(skip, skip + limit),
    total: products.length,
    skip,
    limit,
  };
}

export const handlers = [
  http.get(`${API}/products/categories`, () => HttpResponse.json(categoriesFixture)),

  http.get(`${API}/products/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const matches = productsFixture.filter(
      (product) => product.title.toLowerCase().includes(q) || product.description.toLowerCase().includes(q),
    );
    return HttpResponse.json(paginate(matches, url));
  }),

  http.get(`${API}/products/category/:slug`, ({ request, params }) => {
    const url = new URL(request.url);
    return HttpResponse.json(paginate(productsFixture.filter((product) => product.category === params.slug), url));
  }),

  http.get(`${API}/products`, ({ request }) => HttpResponse.json(paginate(productsFixture, new URL(request.url)))),

  http.get(`${API}/products/:id`, ({ params }) => {
    const product = productsFixture.find((item) => item.id === Number(params.id));
    return product ? HttpResponse.json(product) : HttpResponse.json({ message: "Product not found" }, { status: 404 });
  }),

  http.post(`${API}/products/add`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    await delay(20);
    return HttpResponse.json({ id: 195, ...body }, { status: 201 });
  }),

  http.put(`${API}/products/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Partial<Product>;
    const product = productsFixture.find((item) => item.id === Number(params.id));
    if (!product) return HttpResponse.json({ message: "Product not found" }, { status: 404 });
    return HttpResponse.json({ ...product, ...body });
  }),

  http.delete(`${API}/products/:id`, ({ params }) => {
    const product = productsFixture.find((item) => item.id === Number(params.id));
    if (!product) return HttpResponse.json({ message: "Product not found" }, { status: 404 });
    return HttpResponse.json({ ...product, isDeleted: true, deletedOn: new Date().toISOString() });
  }),
];
