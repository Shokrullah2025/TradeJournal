import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WhenYouWinChart from "./WhenYouWinChart";

// WhenYouWinChart buckets closed trades into a day-of-week x trading-hour
// heatmap. Weekends and out-of-session hours (before 9 / after 16) are
// dropped. Dates are built with the local-time constructor so getDay()/
// getHours() are deterministic regardless of the runner's timezone.
//
// 2024-01-02 is a Tuesday (dow=2 -> dayIdx=1); 2024-01-03 is a Wednesday.
const weekdayTrade = (year, monthIdx, day, hour, pnl) => ({
  id: `${year}-${monthIdx}-${day}-${hour}`,
  status: "closed",
  exit_date: new Date(year, monthIdx, day, hour, 0, 0),
  pnl,
  instrument: "ES",
});

describe("WhenYouWinChart", () => {
  it("shows the empty state with no trades (edge case)", () => {
    render(<WhenYouWinChart trades={[]} />);
    expect(screen.getByTestId("when-you-win-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state when trades prop is omitted (error/edge resilience)", () => {
    render(<WhenYouWinChart />);
    expect(screen.getByTestId("when-you-win-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state when all trades fall on weekends (edge case)", () => {
    // 2024-01-06 is Saturday, 2024-01-07 is Sunday
    render(
      <WhenYouWinChart
        trades={[
          weekdayTrade(2024, 0, 6, 10, 100),
          weekdayTrade(2024, 0, 7, 11, -50),
        ]}
      />
    );
    expect(screen.getByTestId("when-you-win-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state when trades are outside session hours (edge case)", () => {
    // 03:00 and 20:00 are outside the 9-16 window
    render(
      <WhenYouWinChart
        trades={[
          weekdayTrade(2024, 0, 2, 3, 100),
          weekdayTrade(2024, 0, 2, 20, -50),
        ]}
      />
    );
    expect(screen.getByTestId("when-you-win-empty-state")).toBeInTheDocument();
  });

  it("renders the heatmap and a cell for an in-session weekday trade (happy path)", () => {
    render(
      <WhenYouWinChart trades={[weekdayTrade(2024, 0, 2, 10, 500)]} />
    );

    expect(screen.getByTestId("when-you-win-chart")).toBeInTheDocument();
    // Tuesday (dayIdx 1) at hour 10 should have a colored cell
    expect(screen.getByTestId("when-you-win-cell-1-10")).toBeInTheDocument();
  });

  it("aggregates multiple weekday trades into the grid (happy path)", () => {
    render(
      <WhenYouWinChart
        trades={[
          weekdayTrade(2024, 0, 2, 10, 200), // Tue 10:00
          weekdayTrade(2024, 0, 3, 14, -100), // Wed 14:00
        ]}
      />
    );

    expect(screen.getByTestId("when-you-win-cell-1-10")).toBeInTheDocument();
    expect(screen.getByTestId("when-you-win-cell-2-14")).toBeInTheDocument();
  });
});
