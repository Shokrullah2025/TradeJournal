import { useEffect, useRef } from "react";
import { buildSmoothPath } from "../chartConfig";
import { getToolDefaults } from "../drawingDefaults";

/**
 * Custom hook for managing brush/freehand drawing tools in the BacktestChart
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.drawingMode - Current drawing mode ('brush', 'selector', 'eraser', etc.)
 * @param {React.RefObject} params.wrapperRef - Ref to the chart wrapper element
 * @param {React.RefObject} params.chartRef - Ref to the LightweightCharts instance
 * @param {React.RefObject} params.seriesRef - Ref to the chart series (contains main series)
 * @param {Function} params.onDrawingAdd - Callback to add a completed drawing
 * @returns {Object} - Returns { brushSvgRef } for rendering the live brush stroke
 */
export function useDrawingTools({ drawingMode, wrapperRef, chartRef, seriesRef, onDrawingAdd }) {
  const brushSvgRef = useRef(null);      // separate SVG for live brush stroke
  const brushPointsRef = useRef(null);   // current stroke points [{logicalIdx, price}]
  const drawingModeRef = useRef(null);
  const onDrawingAddRef = useRef(onDrawingAdd);

  // Keep refs in sync
  useEffect(() => { onDrawingAddRef.current = onDrawingAdd; }, [onDrawingAdd]);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);

  // ── Brush / freehand stroke capture ──
  useEffect(() => {
    if (drawingMode !== "brush") {
      brushPointsRef.current = null;
      if (brushSvgRef.current) brushSvgRef.current.innerHTML = "";
      return;
    }
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Saved per-tool defaults — user-chosen brush color/thickness, if any
    const brushDefaults = getToolDefaults("freehand") || {};
    const strokeColor = brushDefaults.color || "#1E53E5";
    const strokeWidth = brushDefaults.lineWidth || 2;

    const getPoint = (e) => {
      const svg = brushSvgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Store as screen-relative fractions so the stroke is truly free-form
      // (no per-bar quantization). Rendering scales to current SVG size.
      return { xFrac: x / rect.width, yFrac: y / rect.height };
    };

    const renderStroke = (points) => {
      const bsvg = brushSvgRef.current;
      if (!bsvg || points.length < 2) return;
      bsvg.innerHTML = "";
      const rect = bsvg.getBoundingClientRect();
      const w = rect.width || 1, h = rect.height || 1;
      const pts = points.map(({ xFrac, yFrac }) => ({ x: xFrac * w, y: yFrac * h }));
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", buildSmoothPath(pts));
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", String(strokeWidth));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      bsvg.appendChild(path);
    };

    let isDrawing = false;

    const onMouseDown = (e) => {
      if (e.button !== 0 || drawingModeRef.current !== "brush") return;
      e.stopPropagation();
      e.preventDefault();
      isDrawing = true;
      const pt = getPoint(e);
      brushPointsRef.current = pt ? [pt] : [];
    };

    const onMouseMove = (e) => {
      if (!isDrawing || !brushPointsRef.current) return;
      e.preventDefault();
      const pt = getPoint(e);
      if (pt) {
        brushPointsRef.current.push(pt);
        renderStroke(brushPointsRef.current);
      }
    };

    const onMouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      const points = brushPointsRef.current;
      if (points && points.length >= 2) {
        // onDrawingAdd may be passed as a plain function or wrapped in a ref —
        // unwrap so the call never throws (a throw here skipped the cleanup
        // below and made earlier strokes silently vanish on the next stroke)
        const cb = onDrawingAddRef.current;
        const fn = typeof cb === "function" ? cb : cb?.current;
        fn?.({ type: "freehand", points, color: strokeColor, lineWidth: strokeWidth });
      }
      brushPointsRef.current = null;
      if (brushSvgRef.current) brushSvgRef.current.innerHTML = "";
    };

    wrapper.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      wrapper.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      brushPointsRef.current = null;
      if (brushSvgRef.current) brushSvgRef.current.innerHTML = "";
    };
  }, [drawingMode]); // eslint-disable-line

  return { brushSvgRef };
}
