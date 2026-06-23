import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TradeForm from "./TradeForm";

// ── Mock the data hooks so the form mounts without Supabase/network ──
const templatesMock = vi.fn();

vi.mock("../../hooks/useTemplates", () => ({
  useTemplates: () => templatesMock(),
}));
vi.mock("../../hooks/useUserSettings", () => ({
  useUserSettings: () => ({
    strategies: [],
    setups: [],
    riskProfiles: [],
    loading: false,
    saveStrategies: vi.fn(),
    saveSetups: vi.fn(),
    saveRiskProfiles: vi.fn(),
  }),
}));
vi.mock("../../context/TradeContext", () => ({
  useTrades: () => ({
    addTrade: vi.fn(),
    updateTrade: vi.fn(),
    saveTradeImage: vi.fn(),
    deleteTradeImage: vi.fn(),
    updateTradeImageOrder: vi.fn(),
    refreshTrades: vi.fn(),
  }),
}));

/**
 * Screenshots follow the same per-template field-visibility system as every
 * other field (Settings → Configure Fields → "Screenshots & Attachments").
 * The panel shows by default and is hidden only when the user's default
 * template explicitly turns the "screenshots" field off.
 */
describe("TradeForm — Screenshots panel visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templatesMock.mockReturnValue({ templates: [] });
  });

  it("shows the Screenshots panel by default (no template visibility config)", () => {
    render(<TradeForm onClose={() => {}} />);
    expect(screen.getByTestId("trade-form-images-panel")).toBeInTheDocument();
    expect(screen.getByTestId("trade-form-photo-count")).toBeInTheDocument();
  });

  it("shows the Screenshots panel when the default template enables the field", () => {
    templatesMock.mockReturnValue({
      templates: [
        { id: 1, name: "Default", isDefault: true, visibleFields: { screenshots: true, strategy: true } },
      ],
    });
    render(<TradeForm onClose={() => {}} />);
    expect(screen.getByTestId("trade-form-images-panel")).toBeInTheDocument();
  });

  it("hides the Screenshots panel when the default template turns the field off", () => {
    templatesMock.mockReturnValue({
      templates: [
        { id: 1, name: "Default", isDefault: true, visibleFields: { screenshots: false, strategy: true } },
      ],
    });
    render(<TradeForm onClose={() => {}} />);
    expect(screen.queryByTestId("trade-form-images-panel")).not.toBeInTheDocument();
  });

  it("falls back to the first template when none is starred as default", () => {
    // New-trade auto-load: with no isDefault template, the first one in the
    // list still loads, so its screenshots:false config hides the panel.
    templatesMock.mockReturnValue({
      templates: [
        { id: 1, name: "First", isDefault: false, visibleFields: { screenshots: false } },
        { id: 2, name: "Second", isDefault: false, visibleFields: { screenshots: true } },
      ],
    });
    render(<TradeForm onClose={() => {}} />);
    expect(screen.queryByTestId("trade-form-images-panel")).not.toBeInTheDocument();
  });
});
