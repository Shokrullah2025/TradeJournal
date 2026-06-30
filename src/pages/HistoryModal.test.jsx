import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HistoryModal } from "./Backtest";

// HistoryModal is the session-detail view. These tests cover the note section's
// read-only-by-default behaviour and its 3-dots Edit / Delete menu. Rendered on
// the desktop layout (the global matchMedia mock reports no match → not mobile).
const session = {
  id: "s1",
  name: "Session One",
  symbol: "NQ",
  instrumentName: "NASDAQ 100 Futures",
  timeframe: "15m",
  strategy: "ICT",
  setup: "FVG",
  createdAt: "2026-06-20T12:00:00Z",
  initialBalance: 10000,
  endingBalance: 10500,
  trades: [],
  tags: [],
  note: "<p>Held the runner</p>",
};

describe("HistoryModal — note section", () => {
  it("shows the note read-only by default, with no editor or open menu (happy path)", () => {
    render(<HistoryModal session={session} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByTestId("history-modal-note-readonly")).toBeInTheDocument();
    expect(screen.getByText("Held the runner")).toBeInTheDocument();
    // The rich-text editor is not mounted until the user chooses Edit.
    expect(screen.queryByTestId("history-modal-note-input-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("history-modal-note-menu")).not.toBeInTheDocument();
  });

  it("opens an Edit / Delete menu from the 3-dots and enters edit mode on Edit", () => {
    render(<HistoryModal session={session} onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByTestId("history-modal-note-menu-btn"));
    const menu = screen.getByTestId("history-modal-note-menu");
    expect(within(menu).getByTestId("history-modal-note-edit-btn")).toBeInTheDocument();
    expect(within(menu).getByTestId("history-modal-note-delete-btn")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("history-modal-note-edit-btn"));
    // The editor replaces the read-only view.
    expect(screen.getByTestId("history-modal-note-input-input")).toBeInTheDocument();
    expect(screen.queryByTestId("history-modal-note-readonly")).not.toBeInTheDocument();
  });

  it("clears the note via Delete and surfaces a Save action (edge case)", () => {
    render(<HistoryModal session={session} onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByTestId("history-modal-note-menu-btn"));
    fireEvent.click(screen.getByTestId("history-modal-note-delete-btn"));

    // The note text is gone and the empty-state hint shows instead.
    expect(screen.queryByText("Held the runner")).not.toBeInTheDocument();
    expect(screen.getByText(/No notes yet/i)).toBeInTheDocument();
    // Clearing the note makes the modal dirty, so Save Changes appears.
    expect(screen.getByTestId("history-modal-save-btn")).toBeInTheDocument();
  });
});
