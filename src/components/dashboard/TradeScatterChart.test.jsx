import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TradeScatterChart from "./TradeScatterChart";

// TradeScatterChart plots one dot per closed trade (x=exit time, y=P&L).
// It needs at least two valid points to render; otherwise an empty state.
const closed = (date, pnl, instrument = "ES") => ({
  id: `${date}-${pnl}`,
  status: "closed",
  exit_date: date,
  pnl,
  instrument,
});

describe("TradeScatterChart", () => {
  it("shows the empty state with no trades (edge case)", () => {
    render(<TradeScatterChart trades={[]} />);
    expect(screen.getByTestId("trade-scatter-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state with only one valid trade (edge case)", () => {
    render(<TradeScatterChart trades={[closed("2024-01-02T15:00:00Z", 100)]} />);
    expect(screen.getByTestId("trade-scatter-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state when trades prop is omitted (error/edge resilience)", () => {
    render(<TradeScatterChart />);
    expect(screen.getByTestId("trade-scatter-empty-state")).toBeInTheDocument();
  });

  it("renders a dot per trade for two or more trades (happy path)", () => {
    render(
      <TradeScatterChart
        trades={[
          closed("2024-01-02T15:00:00Z", 300),
          closed("2024-01-03T15:00:00Z", -150),
          closed("2024-01-04T15:00:00Z", 80),
        ]}
      />
    );

    expect(screen.getByTestId("trade-scatter-chart")).toBeInTheDocument();
    expect(screen.getByTestId("trade-scatter-dot-0")).toBeInTheDocument();
    expect(screen.getByTestId("trade-scatter-dot-2")).toBeInTheDocument();
  });

  it("ignores trades with invalid dates (error/edge resilience)", () => {
    render(
      <TradeScatterChart
        trades={[
          closed("garbage", 300),
          closed("2024-01-03T15:00:00Z", -150),
          closed("also-bad", 80),
        ]}
      />
    );
    // Only one valid point remains -> below the 2-point threshold -> empty
    expect(screen.getByTestId("trade-scatter-empty-state")).toBeInTheDocument();
  });

  it("shows a tooltip on hover over a dot", () => {
    render(
      <TradeScatterChart
        trades={[
          closed("2024-01-02T15:00:00Z", 300, "NQ"),
          closed("2024-01-03T15:00:00Z", -150, "ES"),
        ]}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId("trade-scatter-dot-0"), {
      clientX: 20,
      clientY: 20,
    });

    expect(screen.getByTestId("trade-scatter-tooltip")).toBeInTheDocument();
  });
});
