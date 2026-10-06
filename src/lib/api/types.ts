export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand?: string;
  sku?: string;
  tags?: string[];
  weight?: number;
  dimensions?: Dimensions;
  availabilityStatus?: string;
  thumbnail?: string;
  images?: string[];
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

/** Fields that can be edited inline from the inventory directory. */
export type EditableProductFields = Pick<Product, "title" | "price" | "stock" | "discountPercentage">;

export interface UpdateProductArg {
  id: number;
  changes: Partial<EditableProductFields>;
}

export interface DeleteProductResponse extends Product {
  isDeleted: boolean;
  deletedOn: string;
}

export interface ProductVariationPayload {
  color: string;
  size: string;
  sku: string;
  extraPrice: number;
}

export interface CreateProductPayload {
  title: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  discountPercentage: number;
  variations: ProductVariationPayload[];
  weight: number;
  dimensions: Dimensions;
  shipping: {
    fragile: boolean;
    hazardousDisclaimerAccepted: boolean;
    notes: string;
  };
}

export type CreatedProduct = CreateProductPayload & { id: number };
