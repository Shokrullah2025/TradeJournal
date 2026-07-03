import { describe, it, expect } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../../contexts/ThemeContext";
import CumulativePnLChart from "./CumulativePnLChart";

// The chart reads its colors from ThemeContext (light/dark), so tests render
// inside the real provider (matchMedia is mocked in tests/setup.js).
const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

// CumulativePnLChart is a controlled chart: it receives pre-aggregated
// `data` (running totals) and matching `dates`. Tests cover the <2-point
// empty state, normal rendering, negative domains, and hover.
const dates = (n) =>
  Array.from({ length: n }, (_, i) => new Date(`2024-01-0${i + 1}T12:00:00Z`));

describe("CumulativePnLChart", () => {
  it("shows the empty state with no data (edge case)", () => {
    render(<CumulativePnLChart data={[]} dates={[]} />);
    expect(
      screen.getByTestId("cumulative-pnl-chart-empty-state")
    ).toBeInTheDocument();
  });

  it("shows the empty state with a single point (edge case)", () => {
    render(<CumulativePnLChart data={[100]} dates={dates(1)} />);
    expect(
      screen.getByTestId("cumulative-pnl-chart-empty-state")
    ).toBeInTheDocument();
  });

  it("renders the chart with two or more points (happy path)", () => {
    render(<CumulativePnLChart data={[0, 100, 250]} dates={dates(3)} />);
    expect(screen.getByTestId("cumulative-pnl-chart")).toBeInTheDocument();
    // Y axis labels are emitted with stable testids
    expect(screen.getByTestId("cumulative-pnl-chart-ylabel-0")).toBeInTheDocument();
  });

  it("renders a negative domain without crashing (edge case)", () => {
    render(<CumulativePnLChart data={[0, -50, -200]} dates={dates(3)} />);
    expect(screen.getByTestId("cumulative-pnl-chart")).toBeInTheDocument();
  });

  it("uses default empty props when none are supplied (error/edge resilience)", () => {
    render(<CumulativePnLChart />);
    expect(
      screen.getByTestId("cumulative-pnl-chart-empty-state")
    ).toBeInTheDocument();
  });

  it("shows a tooltip on hover within the plot area", () => {
    render(<CumulativePnLChart data={[0, 100, 250]} dates={dates(3)} />);

    const chart = screen.getByTestId("cumulative-pnl-chart");
    // Mouse X inside the plotted range [PAD_LEFT=38 .. ~108] triggers hover.
    fireEvent.mouseMove(chart, { clientX: 60, clientY: 40 });

    expect(
      screen.getByTestId("cumulative-pnl-chart-tooltip")
    ).toBeInTheDocument();
  });
});
