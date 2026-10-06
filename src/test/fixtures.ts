import type { Category, Product } from "@/lib/api/types";

export function makeProduct(overrides: Partial<Product> & { id: number }): Product {
  return {
    title: `Product ${overrides.id}`,
    description: "A perfectly ordinary product used in tests.",
    category: "smartphones",
    price: 100,
    discountPercentage: 0,
    rating: 4.2,
    stock: 25,
    brand: "Acme",
    sku: `SKU-${overrides.id}`,
    thumbnail: undefined,
    ...overrides,
  };
}

export const categoriesFixture: Category[] = [
  { slug: "smartphones", name: "Smartphones", url: "https://dummyjson.com/products/category/smartphones" },
  { slug: "laptops", name: "Laptops", url: "https://dummyjson.com/products/category/laptops" },
  { slug: "fragrances", name: "Fragrances", url: "https://dummyjson.com/products/category/fragrances" },
];

export const productsFixture: Product[] = [
  makeProduct({ id: 1, title: "iPhone 15", category: "smartphones", price: 999, brand: "Apple" }),
  makeProduct({ id: 2, title: "Galaxy S24", category: "smartphones", price: 899, brand: "Samsung" }),
  makeProduct({ id: 3, title: "MacBook Air", category: "laptops", price: 1299, brand: "Apple" }),
  makeProduct({ id: 4, title: "ThinkPad X1", category: "laptops", price: 1499, brand: "Lenovo", stock: 3 }),
  makeProduct({ id: 5, title: "Chanel No. 5", category: "fragrances", price: 120, brand: "Chanel", stock: 0 }),
  makeProduct({ id: 6, title: "Phone Stand", category: "laptops", price: 19, brand: "Generic" }),
];
