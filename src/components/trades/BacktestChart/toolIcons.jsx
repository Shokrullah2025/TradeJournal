import React from "react";

// Custom drawing-toolbar icons — each glyph mirrors what the tool actually
// draws (lucide's generic icons were misleading, e.g. segment looked like an
// unlimited line). All accept className/style like lucide icons do.

// Line segment — fixed-length line with a dot on each end
export const SegmentIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <circle cx="5.5" cy="18.5" r="2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="5.5" r="2" fill="currentColor" stroke="none" />
  </svg>
);

// Trend line — multi-point path ending in an arrow tip
export const TrendlineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3,19 9.5,13.5 13.5,16 20,7.5" />
    <polyline points="15.5,7 20,7.5 19.5,12" />
  </svg>
);

// Ray — dot at the start, extends to an arrow on the right
export const RayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="5.5" cy="18.5" r="2" fill="currentColor" stroke="none" />
    <line x1="7" y1="17" x2="19" y2="5" />
    <polyline points="13.5,5 19,5 19,10.5" />
  </svg>
);
