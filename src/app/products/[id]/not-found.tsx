import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Product not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        This product does not exist. Products created through the mock API are not persisted by DummyJSON.
      </p>
      <Link href="/products" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline">
        Back to inventory
      </Link>
    </div>
  );
}
