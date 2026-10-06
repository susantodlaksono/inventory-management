import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { failureSimulation } from "@/lib/api/baseQuery";
import { makeProduct } from "@/test/fixtures";
import { API, paginate } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithStore } from "@/test/utils";
import { ProductsDirectory } from "../ProductsDirectory";

vi.mock("next/navigation", () => import("@/test/nextNavigationMock"));

function renderDirectory(url = "/products") {
  window.history.replaceState(null, "", url);
  return renderWithStore(
    <>
      <ProductsDirectory />
      <Toaster />
    </>,
  );
}

const productTitles = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("link")[0].textContent);

describe("ProductsDirectory (integration)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/products");
  });

  it("shows skeletons, then renders products from the API", async () => {
    renderDirectory();
    expect(screen.getAllByLabelText("Loading products").length).toBeGreaterThan(0);
    expect(await screen.findByRole("link", { name: "iPhone 15" })).toBeInTheDocument();
    expect(productTitles()).toHaveLength(6);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1–6 of 6 products");
  });

  it("restores search, category, sort and page from the URL", async () => {
    renderDirectory("/products?search=phone&category=laptops&sort=price_desc");
    expect(await screen.findByRole("link", { name: "Phone Stand" })).toBeInTheDocument();
    expect(productTitles()).toEqual(["Phone Stand"]);
    expect(screen.getByRole("searchbox", { name: /search products/i })).toHaveValue("phone");
    await waitFor(() => expect(screen.getAllByLabelText("Category")[0]).toHaveValue("laptops"));
    expect(screen.getAllByLabelText("Sort by")[0]).toHaveValue("price_desc");
    expect(screen.getByRole("list", { name: /active filters/i })).toHaveTextContent("“phone”");
  });

  it("debounces search input: one request for the final term, and the URL follows", async () => {
    const searchedTerms: string[] = [];
    server.events.on("request:start", ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === "/products/search") searchedTerms.push(url.searchParams.get("q") ?? "");
    });
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });

    await user.type(screen.getByRole("searchbox", { name: /search products/i }), "mac");
    expect(searchedTerms).toEqual([]);

    expect(await screen.findByRole("link", { name: "MacBook Air" })).toBeInTheDocument();
    await waitFor(() => expect(productTitles()).toEqual(["MacBook Air"]));
    expect(searchedTerms).toEqual(["mac"]);
    expect(window.location.search).toBe("?search=mac");
    server.events.removeAllListeners();
  });

  it("never renders a stale response for an older search term", async () => {
    server.use(
      http.get(`${API}/products/search`, async ({ request }) => {
        const q = new URL(request.url).searchParams.get("q");
        // The first term is slow, so its response arrives after the second one.
        if (q === "iphone") await delay(250);
        const products = q === "iphone" ? [makeProduct({ id: 1, title: "iPhone 15" })] : [makeProduct({ id: 3, title: "MacBook Air" })];
        return HttpResponse.json({ products, total: 1, skip: 0, limit: 10 });
      }),
    );
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });
    const input = screen.getByRole("searchbox", { name: /search products/i });

    await user.type(input, "iphone");
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    await user.clear(input);
    await user.type(input, "macbook");

    expect(await screen.findByRole("link", { name: "MacBook Air" })).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(productTitles()).toEqual(["MacBook Air"]);
  });

  it("shows the empty state and can clear filters", async () => {
    const user = userEvent.setup();
    renderDirectory("/products?search=zzzz");
    expect(await screen.findByText("No products found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(await screen.findByRole("link", { name: "iPhone 15" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("filters by category from the dropdown and writes it to the URL", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });
    const select = screen.getAllByLabelText("Category")[0];
    await waitFor(() => expect(within(select).getByRole("option", { name: "Fragrances" })).toBeInTheDocument());

    await user.selectOptions(select, "fragrances");

    await waitFor(() => expect(productTitles()).toEqual(["Chanel No. 5"]));
    expect(window.location.search).toBe("?category=fragrances");
  });

  it("paginates and syncs the page to the URL, and restores it on back navigation", async () => {
    const many = Array.from({ length: 25 }, (_, i) => makeProduct({ id: i + 1, title: `Item ${i + 1}` }));
    server.use(http.get(`${API}/products`, ({ request }) => HttpResponse.json(paginate(many, new URL(request.url)))));
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "Item 1" });

    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(await screen.findByRole("link", { name: "Item 11" })).toBeInTheDocument();
    expect(window.location.search).toBe("?page=2");
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(await screen.findByRole("link", { name: "Item 1" })).toBeInTheDocument();
  });

  it("optimistically deletes, rolls back on failure and recovers via Retry", async () => {
    failureSimulation.rate = 1;
    failureSimulation.latencyMs = 300;
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });

    await user.click(screen.getByRole("button", { name: "Delete iPhone 15" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    // Removed immediately, before the request settles…
    expect(screen.queryByRole("link", { name: "iPhone 15" })).not.toBeInTheDocument();
    // …then restored with an error toast once it fails.
    expect(await screen.findByRole("link", { name: "iPhone 15" })).toBeInTheDocument();
    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/delete failed/i);

    failureSimulation.rate = 0;
    await user.click(within(toast).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "iPhone 15" })).not.toBeInTheDocument());
    expect(await screen.findByText("Deleted “iPhone 15”")).toBeInTheDocument();
  });

  it("optimistically edits a product from the edit dialog", async () => {
    server.use(
      http.put(`${API}/products/:id`, async ({ request }) => {
        await delay(300);
        return HttpResponse.json({ ...makeProduct({ id: 2, title: "Galaxy S24" }), ...((await request.json()) as object) });
      }),
    );
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "Galaxy S24" });

    await user.click(screen.getByRole("button", { name: "Edit Galaxy S24" }));
    const dialog = await screen.findByRole("dialog", { name: /edit product/i });
    const title = within(dialog).getByLabelText(/title/i);
    await user.clear(title);
    await user.type(title, "Galaxy S24 Ultra");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("link", { name: "Galaxy S24 Ultra" })).toBeInTheDocument();
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(await screen.findByText("Saved “Galaxy S24 Ultra”")).toBeInTheDocument();
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });

  it("toggles between table and card layouts and remembers the choice", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });

    await user.click(screen.getByRole("button", { name: "Card view" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("inventory:view-mode")).toBe("grid");
  });

  it("opens the mobile filter drawer", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "iPhone 15" });

    await user.click(screen.getByRole("button", { name: /^filters/i }));
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByLabelText("Category")).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: /show 6 results/i }));
    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("shows an error state with retry when the list request fails", async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.json({ message: "Upstream down" }, { status: 502 })));
    renderDirectory();
    expect(await screen.findByText("Could not load products")).toBeInTheDocument();
    expect(screen.getByText("Upstream down")).toBeInTheDocument();
  });
});
