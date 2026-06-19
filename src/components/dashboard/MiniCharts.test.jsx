import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  MiniLineChart,
  MiniBarChart,
  MiniDonutChart,
  MiniAreaChart,
  MiniRiskRewardChart,
  MiniDrawdownChart,
} from "./MiniCharts";

// The mini charts are tiny SVG sparklines used inside the stats cards. Each
// guards against empty/invalid data by returning null. These tests verify the
// null guards (edge), normal rendering (happy), and the data-driven branches.
describe("MiniLineChart", () => {
  it("renders an SVG polyline for valid data (happy path)", () => {
    const { container } = render(<MiniLineChart data={[1, 5, 3, 8]} color="blue" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("returns nothing for empty data (edge case)", () => {
    const { container } = render(<MiniLineChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns nothing when data is undefined (error/edge resilience)", () => {
    const { container } = render(<MiniLineChart data={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MiniBarChart", () => {
  it("renders one bar per data point up to 8 (happy path)", () => {
    const { container } = render(<MiniBarChart data={[1, 2, 3, 4]} color="green" />);
    // 4 bars are the direct children divs of the flex container
    const bars = container.querySelectorAll("div.flex > div");
    expect(bars.length).toBe(4);
  });

  it("caps the number of bars at 8 (edge case)", () => {
    const { container } = render(
      <MiniBarChart data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} />
    );
    const bars = container.querySelectorAll("div.flex > div");
    expect(bars.length).toBe(8);
  });

  it("returns nothing for empty data (edge case)", () => {
    const { container } = render(<MiniBarChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MiniDonutChart", () => {
  it("renders the rounded percentage label (happy path)", () => {
    const { getByText } = render(<MiniDonutChart percentage={66.6} color="blue" />);
    expect(getByText("67")).toBeInTheDocument();
  });

  it("renders 0 for a zero percentage (edge case)", () => {
    const { getByText } = render(<MiniDonutChart percentage={0} />);
    expect(getByText("0")).toBeInTheDocument();
  });

  it("renders 100 for a full percentage (edge case)", () => {
    const { getByText } = render(<MiniDonutChart percentage={100} />);
    expect(getByText("100")).toBeInTheDocument();
  });
});

describe("MiniAreaChart", () => {
  it("renders an area polygon and line for valid data (happy path)", () => {
    const { container } = render(<MiniAreaChart data={[1, 2, 3]} color="green" />);
    expect(container.querySelector("polygon")).toBeInTheDocument();
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("returns nothing for empty data (edge case)", () => {
    const { container } = render(<MiniAreaChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MiniRiskRewardChart", () => {
  it("renders win and loss bars for valid amounts (happy path)", () => {
    const { getByText } = render(
      <MiniRiskRewardChart winAmount={200} lossAmount={100} />
    );
    expect(getByText("W")).toBeInTheDocument();
    expect(getByText("L")).toBeInTheDocument();
  });

  it("returns nothing when both amounts are zero (edge case)", () => {
    const { container } = render(
      <MiniRiskRewardChart winAmount={0} lossAmount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns nothing when both amounts are negative (error/edge resilience)", () => {
    const { container } = render(
      <MiniRiskRewardChart winAmount={-5} lossAmount={-3} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("MiniDrawdownChart", () => {
  it("renders the underwater curve for valid data (happy path)", () => {
    const { container } = render(
      <MiniDrawdownChart drawdownData={[0, -10, -25, -5]} />
    );
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("returns nothing for empty data (edge case)", () => {
    const { container } = render(<MiniDrawdownChart drawdownData={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns nothing when data is undefined (error/edge resilience)", () => {
    const { container } = render(<MiniDrawdownChart drawdownData={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
