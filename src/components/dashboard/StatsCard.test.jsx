import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DollarSign } from "lucide-react";
import StatsCard from "./StatsCard";

// StatsCard is a pure presentational card. These tests verify it renders the
// title/value/change a parent feeds it, swaps trend styling on changeType,
// renders an optional mini chart, and degrades gracefully on odd input.
describe("StatsCard", () => {
  const baseProps = {
    title: "Total P&L",
    value: "$1,500",
    change: "+12.5%",
    changeType: "positive",
    icon: DollarSign,
    color: "success",
  };

  it("renders the title, value, and change (happy path)", () => {
    render(<StatsCard {...baseProps} />);

    expect(screen.getByText("Total P&L")).toBeInTheDocument();
    expect(screen.getByText("$1,500")).toBeInTheDocument();
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
  });

  it("applies positive trend styling and an up icon when changeType is positive", () => {
    const { container } = render(<StatsCard {...baseProps} changeType="positive" />);

    const changeEl = screen.getByText("+12.5%").parentElement;
    expect(changeEl.className).toContain("text-success-600");
    // lucide-react renders an <svg>; the icon plus trend icon = at least 2 svgs
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("applies negative trend styling when changeType is negative", () => {
    render(
      <StatsCard {...baseProps} change="-3.2%" changeType="negative" color="danger" />
    );

    const changeEl = screen.getByText("-3.2%").parentElement;
    expect(changeEl.className).toContain("text-danger-600");
  });

  it("renders a mini chart when one is provided", () => {
    render(
      <StatsCard
        {...baseProps}
        miniChart={<div data-test-id="injected-mini-chart">chart</div>}
      />
    );

    expect(screen.getByTestId("injected-mini-chart")).toBeInTheDocument();
  });

  it("does not render a mini chart container when none is provided (edge case)", () => {
    render(<StatsCard {...baseProps} miniChart={null} />);

    expect(screen.queryByTestId("injected-mini-chart")).not.toBeInTheDocument();
  });

  it("still renders the value when given an unknown color (error/edge resilience)", () => {
    render(<StatsCard {...baseProps} color="not-a-real-color" />);

    // Even with an unmapped color the card must not crash and must show data.
    expect(screen.getByText("$1,500")).toBeInTheDocument();
  });

  it("renders N/A style values without breaking (edge case)", () => {
    render(<StatsCard {...baseProps} title="Avg Win/Loss" value="N/A" />);

    expect(screen.getByText("Avg Win/Loss")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
