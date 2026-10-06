"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

const NAV_ITEMS = [
  { href: "/products", label: "Inventory" },
  { href: "/products/new", label: "New product" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/products" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            S
          </span>
          Stockroom
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/products" ? pathname === "/products" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
