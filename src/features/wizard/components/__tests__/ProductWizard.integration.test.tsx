import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { DRAFT_STORAGE_KEY, loadDraft, saveDraftToStorage } from "@/features/wizard/draftStorage";
import { DEFAULT_WIZARD_VALUES } from "@/features/wizard/schemas/formTypes";
import { API } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithStore } from "@/test/utils";
import { ProductWizard } from "../ProductWizard";

const stepHeading = () => screen.getByRole("heading", { level: 2 });
const next = (user: UserEvent) => user.click(screen.getByRole("button", { name: /^next/i }));

async function fillBasicInfo(user: UserEvent) {
  await user.type(screen.getByLabelText(/product title/i), "Ceramic Vase");
  await user.type(screen.getByLabelText(/brand/i), "Studio Clay");
  const category = screen.getByLabelText(/category/i);
  await waitFor(() => expect(within(category).getByRole("option", { name: "Laptops" })).toBeInTheDocument());
  await user.selectOptions(category, "laptops");
  await user.type(screen.getByLabelText(/description/i), "Hand-thrown ceramic vase with a matte glaze.");
}

async function fillShipping(user: UserEvent) {
  await user.type(screen.getByLabelText(/weight/i), "2.5");
  await user.type(screen.getByLabelText(/width/i), "20");
  await user.type(screen.getByLabelText(/height/i), "35");
  await user.type(screen.getByLabelText(/depth/i), "20");
}

describe("ProductWizard (integration)", () => {
  it("validates every step and submits the product to POST /products/add", async () => {
    let requestBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/products/add`, async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 195, ...requestBody }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithStore(<ProductWizard />);

    // Step 1: required fields block navigation.
    expect(stepHeading()).toHaveTextContent("Basic info");
    await next(user);
    expect(await screen.findByText("Product title is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(stepHeading()).toHaveTextContent("Basic info");

    await fillBasicInfo(user);
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Pricing & variations"));

    // Step 2: price bounds and dynamic SKU variations.
    await user.type(screen.getByLabelText(/base price/i), "0");
    await user.type(screen.getByLabelText(/stock quantity/i), "12");
    await next(user);
    expect(await screen.findByText("Base price must be greater than 0")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/base price/i));
    await user.type(screen.getByLabelText(/base price/i), "80");
    await user.type(screen.getByLabelText(/discount/i), "10");
    expect(screen.getByText("$72.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add variation/i }));
    await user.click(screen.getByRole("button", { name: /add variation/i }));
    const rows = screen.getAllByTestId(/variation-row-/);
    expect(rows).toHaveLength(2);

    for (const [index, row] of rows.entries()) {
      await user.type(within(row).getByLabelText(/color/i), index === 0 ? "White" : "Black");
      await user.type(within(row).getByLabelText(/size/i), "M");
      await user.type(within(row).getByLabelText(/sku code/i), "sku-wht-100");
    }
    await next(user);
    // Invalid format on both rows.
    expect(await screen.findAllByText(/SKU must match SKU-ABC-1234/)).toHaveLength(2);

    // Valid format but duplicated: only the second row is flagged.
    for (const row of rows) {
      await user.clear(within(row).getByLabelText(/sku code/i));
      await user.type(within(row).getByLabelText(/sku code/i), "sku-wht-1001");
    }
    await next(user);
    expect(await within(rows[1]).findByText("SKU codes must be unique")).toBeInTheDocument();
    expect(within(rows[0]).queryByText("SKU codes must be unique")).not.toBeInTheDocument();

    await user.clear(within(rows[1]).getByLabelText(/sku code/i));
    await user.type(within(rows[1]).getByLabelText(/sku code/i), "SKU-BLK-1002");
    await user.clear(within(rows[1]).getByLabelText(/extra price/i));
    await user.type(within(rows[1]).getByLabelText(/extra price/i), "5");
    expect(within(rows[1]).getByText("$85.00")).toBeInTheDocument();
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Shipping"));

    // Step 3: conditional fragile handling.
    await fillShipping(user);
    expect(screen.queryByLabelText(/special shipping notes/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/requires special fragile handling/i));
    expect(screen.getByTestId("fragile-section")).toBeInTheDocument();
    await next(user);
    expect(await screen.findByText("You must accept the hazardous material disclaimer for fragile items")).toBeInTheDocument();
    expect(screen.getByText("Special shipping notes are required for fragile items")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/hazardous material disclaimer/i));
    await user.type(screen.getByLabelText(/special shipping notes/i), "Short");
    await next(user);
    expect(await screen.findByText("Shipping notes must be at least 10 characters")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/special shipping notes/i), " - double box with foam");
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Review"));

    // Step 4: review, edit without losing data, then submit.
    expect(screen.getByText("Ceramic Vase")).toBeInTheDocument();
    expect(screen.getByText("SKU-WHT-1001")).toBeInTheDocument();
    expect(screen.getByText("SKU-BLK-1002")).toBeInTheDocument();
    expect(screen.getByText("Short - double box with foam")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit basic information/i }));
    expect(stepHeading()).toHaveTextContent("Basic info");
    expect(screen.getByLabelText(/product title/i)).toHaveValue("Ceramic Vase");
    await user.clear(screen.getByLabelText(/product title/i));
    await user.type(screen.getByLabelText(/product title/i), "Ceramic Vase XL");
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Pricing & variations"));
    expect(screen.getAllByTestId(/variation-row-/)).toHaveLength(2);
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Shipping"));
    expect(screen.getByLabelText(/requires special fragile handling/i)).toBeChecked();
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Review"));

    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByRole("heading", { name: /product created/i })).toBeInTheDocument();
    expect(screen.getByText("195")).toBeInTheDocument();
    expect(requestBody).toEqual({
      title: "Ceramic Vase XL",
      brand: "Studio Clay",
      category: "laptops",
      description: "Hand-thrown ceramic vase with a matte glaze.",
      price: 80,
      stock: 12,
      discountPercentage: 10,
      variations: [
        { color: "White", size: "M", sku: "SKU-WHT-1001", extraPrice: 0 },
        { color: "Black", size: "M", sku: "SKU-BLK-1002", extraPrice: 5 },
      ],
      weight: 2.5,
      dimensions: { width: 20, height: 35, depth: 20 },
      shipping: { fragile: true, hazardousDisclaimerAccepted: true, notes: "Short - double box with foam" },
    });
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("shows an error and keeps the draft when the API rejects the submission", async () => {
    server.use(http.post(`${API}/products/add`, () => HttpResponse.json({ message: "Service unavailable" }, { status: 503 })));
    saveDraftToStorage({
      step: 4,
      savedAt: new Date().toISOString(),
      values: {
        ...DEFAULT_WIZARD_VALUES,
        title: "Desk Lamp",
        brand: "Acme",
        category: "laptops",
        description: "An adjustable LED desk lamp for focused work.",
        price: 40,
        stock: 3,
        weight: 1,
        dimensions: { width: 10, height: 40, depth: 10 },
      },
    });
    const user = userEvent.setup();
    renderWithStore(<ProductWizard />);

    await user.click(await screen.findByRole("button", { name: /resume draft/i }));
    expect(stepHeading()).toHaveTextContent("Review");
    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByText(/Service unavailable/)).toBeInTheDocument();
    expect(loadDraft()?.values.title).toBe("Desk Lamp");
  });

  it("offers to resume a saved draft and restores values and step", async () => {
    saveDraftToStorage({
      step: 2,
      savedAt: "2026-03-01T12:00:00.000Z",
      values: { ...DEFAULT_WIZARD_VALUES, title: "Saved Lamp", brand: "Lumen", price: 25 },
    });
    const user = userEvent.setup();
    renderWithStore(<ProductWizard />);

    const dialog = await screen.findByRole("dialog", { name: /resume saved product draft\?/i });
    expect(within(dialog).getByText(/Saved Lamp/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /resume draft/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stepHeading()).toHaveTextContent("Pricing & variations");
    expect(screen.getByLabelText(/base price/i)).toHaveValue(25);
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/product title/i)).toHaveValue("Saved Lamp");
  });

  it("discards a saved draft when starting over", async () => {
    saveDraftToStorage({ step: 3, savedAt: new Date().toISOString(), values: { ...DEFAULT_WIZARD_VALUES, title: "Old" } });
    const user = userEvent.setup();
    renderWithStore(<ProductWizard />);

    await user.click(await screen.findByRole("button", { name: /start over/i }));
    expect(stepHeading()).toHaveTextContent("Basic info");
    expect(screen.getByLabelText(/product title/i)).toHaveValue("");
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("autosaves the draft while typing", async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<ProductWizard />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/product title/i), "Autosaved");
    await waitFor(() => expect(loadDraft()?.values.title).toBe("Autosaved"));
    expect(store.getState().draft.values?.title).toBe("Autosaved");
    expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
  });

  it("keeps the form editable after an autosave (draft is a copy, not RHF's internal state)", async () => {
    const user = userEvent.setup();
    renderWithStore(<ProductWizard />);
    await fillBasicInfo(user);
    await next(user);
    await waitFor(() => expect(stepHeading()).toHaveTextContent("Pricing & variations"));
    await user.type(screen.getByLabelText(/base price/i), "10");
    await user.type(screen.getByLabelText(/stock quantity/i), "1");
    await user.click(screen.getByRole("button", { name: /add variation/i }));
    await user.click(screen.getByRole("button", { name: /add variation/i }));
    const rows = screen.getAllByTestId(/variation-row-/);
    for (const row of rows) {
      await user.type(within(row).getByLabelText(/color/i), "Red");
      await user.type(within(row).getByLabelText(/size/i), "M");
      await user.type(within(row).getByLabelText(/sku code/i), "SKU-RED-1001");
    }
    // Let the debounced autosave persist the duplicate state into Redux.
    await waitFor(() => expect(loadDraft()?.values.variations[1]?.sku).toBe("SKU-RED-1001"));

    await user.clear(within(rows[1]).getByLabelText(/sku code/i));
    await user.type(within(rows[1]).getByLabelText(/sku code/i), "SKU-RED-1002");
    await next(user);

    await waitFor(() => expect(stepHeading()).toHaveTextContent("Shipping"));
    await waitFor(() => expect(loadDraft()?.values.variations[1]?.sku).toBe("SKU-RED-1002"));
  });
});
