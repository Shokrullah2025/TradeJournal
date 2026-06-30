import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useIsMobile from "./useIsMobile";

// A controllable matchMedia mock: a test can flip `matches` and fire the
// registered change listener, plus inspect how many listeners are attached
// (to assert cleanup on unmount).
function installMatchMedia(initialMatches) {
  let matches = initialMatches;
  const listeners = new Set();
  const mql = {
    get matches() {
      return matches;
    },
    media: "",
    addEventListener: (_event, cb) => listeners.add(cb),
    removeEventListener: (_event, cb) => listeners.delete(cb),
    addListener: (cb) => listeners.add(cb), // deprecated alias
    removeListener: (cb) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn(() => mql);
  return {
    set(next) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
    listenerCount: () => listeners.size,
  };
}

describe("useIsMobile", () => {
  let originalMatchMedia;
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("returns true when the mobile media query matches (happy path)", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false on a desktop (fine pointer / wide screen)", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reacts to viewport / orientation changes (edge case)", () => {
    const ctrl = installMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => ctrl.set(true));
    expect(result.current).toBe(true);
  });

  it("removes its change listener on unmount (no leak)", () => {
    const ctrl = installMatchMedia(true);
    const { unmount } = renderHook(() => useIsMobile());
    expect(ctrl.listenerCount()).toBeGreaterThan(0);

    unmount();
    expect(ctrl.listenerCount()).toBe(0);
  });
});
