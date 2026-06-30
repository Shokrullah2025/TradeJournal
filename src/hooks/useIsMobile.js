import { useEffect, useState } from "react";

// Tailwind's `lg` breakpoint. Below this the app already switches to its mobile
// layout (the sidebar collapses to a hamburger), so we treat it as the "small
// screen" threshold here too.
const MOBILE_MAX_WIDTH_PX = 1024;

// True only on a touch device ("coarse pointer") whose viewport is narrower than
// the lg breakpoint. A desktop/laptop with a mouse (fine pointer) never matches,
// even when its window is dragged small — so anything that needs a precise
// pointer and a large canvas (creating or running a backtest) stays available
// there while phones and most tablets are gated out.
const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH_PX - 1}px) and (pointer: coarse)`;

// Reactive flag for "is this a mobile/touch device on a small screen".
// Re-evaluates on viewport/orientation changes and cleans up its listener on
// unmount.
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);
    // Sync once in case the match changed between the initial render and now.
    setIsMobile(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
