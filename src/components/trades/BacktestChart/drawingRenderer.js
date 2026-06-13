/**
 * SVG Drawing Renderer
 *
 * Pure functions for rendering chart drawings (trendlines, rays, segments, hlines, vlines,
 * text, fibonacci, rectangles, R/R, freehand, buy/sell markers) to SVG.
 *
 * Extracted from BacktestChart.jsx to maintain separation of concerns.
 */

/**
 * Main function to update all SVG drawings on the chart
 *
 * @param {Object} params - Rendering parameters
 * @param {SVGElement} params.svgRef - SVG element reference
 * @param {SVGElement} params.brushSvgRef - Brush SVG element reference (for live brush strokes)
 * @param {Object} params.chartRef - Lightweight Charts chart instance
 * @param {Object} params.seriesRef - Chart series reference (main candlestick series)
 * @param {Array} params.candleData - Candle data array
 * @param {Array} params.userDrawings - User drawings array
 * @param {Array} params.selectedDrawingIds - Array of selected drawing IDs
 * @param {boolean} params.isDark - Dark mode flag
 * @param {string} params.drawingMode - Current drawing mode
 * @param {Object} params.drawingState - Current drawing state (for two-point drawings)
 * @param {Object} params.previewPoint - Preview point for two-point drawings
 * @param {boolean} params.shiftKey - Shift key state for angle snapping
 * @param {boolean} params.barReplayActive - Bar replay mode flag
 * @param {number} params.visibleCount - Visible candle count (for replay indicator)
 * @param {HTMLElement} params.propsPanel - Properties panel DOM node
 * @param {Object} params.refs - Additional refs object
 * @param {Function} params.onDrawingUpdate - Callback for drawing updates
 * @param {Function} params.onDrawingDelete - Callback for drawing deletion
 * @param {Function} params.onSelectionChange - Callback for selection changes
 * @param {Object} params.svgDragging - Current SVG dragging state
 * @param {boolean} params.wasDragged - Was dragged flag
 */
export function updateSvgDrawings({
  svgRef,
  brushSvgRef,
  chartRef,
  seriesRef,
  candleData,
  userDrawings,
  selectedDrawingIds,
  isDark,
  drawingMode,
  drawingState,
  previewPoint,
  shiftKey,
  barReplayActive,
  visibleCount,
  propsPanel,
  refs = {},
  onDrawingUpdate,
  onDrawingDelete,
  onSelectionChange,
  svgDragging,
  wasDragged,
}) {
  const svg = svgRef;
  if (!svg) return;

  // Clear existing SVG content
  while (svg.lastChild) svg.removeChild(svg.lastChild);

  const chart = chartRef;
  const ts = chart?.timeScale();
  const mn = seriesRef?.main;
  if (!mn || !ts) return;

  const svgW = svg.clientWidth;
  const svgH = svg.clientHeight;

  // No SVG filters — selection uses thicker stroke only, no shadow/glow
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  // CSS hover rules — labels and handles only appear on :hover or when selected
  const rrStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
  rrStyle.textContent = [
    ".rr-labels{visibility:hidden}",
    ".rr-handles{visibility:hidden}",
    ".rr-group:hover .rr-labels{visibility:visible}",
    ".rr-group:hover .rr-handles{visibility:visible}",
    ".rr-selected .rr-labels{visibility:visible}",
    ".rr-selected .rr-handles{visibility:visible}",
  ].join(" ");
  svg.appendChild(rrStyle);

  // Helper: candle interval for time<->logical conversion
  const interval = candleData?.length > 1
    ? candleData[1].time - candleData[0].time : 3600;

  // Attaches grab cursor + move drag to any SVG element
  const attachMoveDrag = (el, drawing, extraState) => {
    el.style.cursor = "move";
    el.addEventListener("mousedown", (e) => {
      if (drawingMode) return;
      e.stopPropagation();
      const svgEl = svgRef;
      const svgRect = svgEl?.getBoundingClientRect();
      const ch = chartRef;
      const mn2 = seriesRef.main;
      const startLogical = ch?.timeScale().coordinateToLogical(e.clientX - (svgRect?.left ?? 0)) ?? 0;
      const startPrice   = mn2?.coordinateToPrice(e.clientY - (svgRect?.top ?? 0)) ?? 0;

      // Set svgDragging state via ref mutation
      if (refs.svgDraggingRef) {
        refs.svgDraggingRef.current = {
          drawingId: drawing.id,
          field: "move",
          drawingType: drawing.type,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startLogical,
          startPrice,
          candleInterval: interval,
          hasMoved: false,
          ...extraState,
        };
      }
    });
  };

  // Helper: attach delete/select click to any SVG element
  const attachInteraction = (el, drawing) => {
    el.addEventListener("click", (e) => {
      if (wasDragged) {
        if (refs.wasDraggedRef) refs.wasDraggedRef.current = false;
        return;
      }
      e.stopPropagation();
      if (drawingMode === "eraser") {
        onDrawingDelete?.(drawing.id);
      } else if (!drawingMode || drawingMode === "selector") {
        onSelectionChange?.(drawing.id, e.ctrlKey || e.metaKey || e.shiftKey);
      }
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  };

  const isSelected = (id) => selectedDrawingIds.includes(id);
  const selStroke = (base, id) => isSelected(id) ? "#60a5fa" : base;
  const selWidth = (id) => isSelected(id) ? "2.5" : "1.5";
  const applyGlow = () => {}; // no glow — selection shown via stroke width only

  // ────────────────────────────────────────────────────────────────────
  // Render all user drawings
  // ────────────────────────────────────────────────────────────────────
  userDrawings.forEach((drawing) => {
    // ── Freehand brush stroke ──
    if (drawing.type === "freehand") {
      if (!drawing.points?.length || drawing.points.length < 2) return;
      const pts = drawing.points.map(({ logicalIdx, price }) => {
        const px = ts.logicalToCoordinate(logicalIdx);
        const py = mn.priceToCoordinate(price);
        return px != null && py != null ? `${px},${py}` : null;
      }).filter(Boolean);
      if (pts.length < 2) return;
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", pts.join(" "));
      polyline.setAttribute("stroke", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#1E53E5"));
      polyline.setAttribute("stroke-width", isSelected(drawing.id) ? String((drawing.lineWidth || 2) + 1) : String(drawing.lineWidth || 2));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      polyline.style.pointerEvents = "stroke";
      attachInteraction(polyline, drawing);
      attachMoveDrag(polyline, drawing, { startPoints: drawing.points.map(p => ({ ...p })) });
      svg.appendChild(polyline);
      return;
    }

    // ── Vertical line ──
    if (drawing.type === "vline") {
      const x = ts.timeToCoordinate(drawing.time);
      if (x == null) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", x); el.setAttribute("y1", 0);
      el.setAttribute("x2", x); el.setAttribute("y2", svgH);
      el.setAttribute("stroke", selStroke(drawing.color || "#f7a600", drawing.id));
      const vBaseW = drawing.lineWidth || 1;
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(vBaseW + 1) : String(vBaseW));
      el.setAttribute("stroke-dasharray", drawing.lineStyle === "solid" ? "" : "4,3");
      el.style.pointerEvents = "stroke";
      applyGlow(el, drawing.id);
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startTime: drawing.time });
      svg.appendChild(el);
      return;
    }

    // ── Horizontal line — extends full width with endpoint arrows ──
    if (drawing.type === "hline") {
      const y = mn.priceToCoordinate(drawing.price);
      if (y == null) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", 0); el.setAttribute("y1", y);
      el.setAttribute("x2", svgW); el.setAttribute("y2", y);
      el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5", drawing.id));
      const hBaseW = drawing.lineWidth || 1;
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(hBaseW + 1) : String(hBaseW));
      el.setAttribute("stroke-dasharray", drawing.lineStyle === "dashed" ? "6,4" : "");
      el.style.pointerEvents = "stroke";
      applyGlow(el, drawing.id);
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startPrice: drawing.price });
      svg.appendChild(el);

      // Add arrow endpoints to indicate line extends infinitely
      const endpointColor = selStroke(drawing.color || "#1E53E5", drawing.id);
      const arrowSize = 5;

      // Left arrow pointing left (unlimited extension)
      const leftArrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      leftArrow.setAttribute("points", `0,${y} ${arrowSize},${y - arrowSize} ${arrowSize},${y + arrowSize}`);
      leftArrow.setAttribute("fill", endpointColor);
      leftArrow.style.pointerEvents = "none";
      svg.appendChild(leftArrow);

      // Right arrow pointing right (unlimited extension)
      const rightArrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      rightArrow.setAttribute("points", `${svgW},${y} ${svgW - arrowSize},${y - arrowSize} ${svgW - arrowSize},${y + arrowSize}`);
      rightArrow.setAttribute("fill", endpointColor);
      rightArrow.style.pointerEvents = "none";
      svg.appendChild(rightArrow);
      return;
    }

    // ── Text label ──
    if (drawing.type === "text") {
      const x = ts.timeToCoordinate(drawing.time);
      const y = mn.priceToCoordinate(drawing.price);
      if (x == null || y == null) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
      el.setAttribute("x", x);
      el.setAttribute("y", y - 4);
      el.setAttribute("fill", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#f7a600"));
      el.setAttribute("font-size", String(drawing.fontSize || 14));
      el.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
      el.setAttribute("font-weight", "600");
      el.style.pointerEvents = "all";
      el.textContent = drawing.label || "Label";
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startP1: { time: drawing.time, price: drawing.price }, startP2: { time: drawing.time, price: drawing.price } });
      svg.appendChild(el);
      return;
    }

    // ── Rectangle ──
    if (drawing.type === "rectangle") {
      const x1 = ts.timeToCoordinate(drawing.p1.time);
      const y1 = mn.priceToCoordinate(drawing.p1.price);
      const x2 = ts.timeToCoordinate(drawing.p2.time);
      const y2 = mn.priceToCoordinate(drawing.p2.price);
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      el.setAttribute("x", rx); el.setAttribute("y", ry);
      el.setAttribute("width", rw); el.setAttribute("height", rh);
      el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5", drawing.id));
      const rectBaseW = drawing.lineWidth || 1;
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(rectBaseW + 1) : String(rectBaseW));
      if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
      el.setAttribute("fill", isSelected(drawing.id) ? "rgba(96,165,250,0.1)" : "rgba(30,83,229,0.06)");
      el.style.pointerEvents = "all";
      applyGlow(el, drawing.id);
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
      svg.appendChild(el);

      // Optional text label centered inside the box
      if (drawing.label) {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", rx + rw / 2);
        txt.setAttribute("y", ry + rh / 2);
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("dominant-baseline", "middle");
        txt.setAttribute("fill", drawing.color || "#1E53E5");
        txt.setAttribute("font-size", String(drawing.fontSize || 13));
        txt.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
        txt.setAttribute("font-weight", "600");
        txt.style.pointerEvents = "none";
        txt.textContent = drawing.label;
        svg.appendChild(txt);
      }
      return;
    }

    // ── Segment — fixed-length line exactly from p1 to p2 ──
    if (drawing.type === "segment") {
      const x1 = ts.timeToCoordinate(drawing.p1.time);
      const y1 = mn.priceToCoordinate(drawing.p1.price);
      const x2 = ts.timeToCoordinate(drawing.p2.time);
      const y2 = mn.priceToCoordinate(drawing.p2.price);
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", x1); el.setAttribute("y1", y1);
      el.setAttribute("x2", x2); el.setAttribute("y2", y2);
      el.setAttribute("stroke", selStroke(drawing.color || "#f7a600", drawing.id));
      const segBaseW = drawing.lineWidth || 1.5;
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(segBaseW + 1) : String(segBaseW));
      if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
      el.style.pointerEvents = "stroke";
      applyGlow(el, drawing.id);
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
      svg.appendChild(el);
      [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
        dot.setAttribute("fill", selStroke(drawing.color || "#f7a600", drawing.id));
        dot.style.pointerEvents = "none";
        svg.appendChild(dot);
      });
      return;
    }

    // ── Ray — extends right from p1 through p2 (limited on left, unlimited on right) ──
    if (drawing.type === "ray") {
      const x1 = ts.timeToCoordinate(drawing.p1.time);
      const y1 = mn.priceToCoordinate(drawing.p1.price);
      const x2 = ts.timeToCoordinate(drawing.p2.time);
      const y2 = mn.priceToCoordinate(drawing.p2.price);
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;
      const dx = x2 - x1, dy = y2 - y1;
      let lx2 = x2, ly2 = y2;
      if (Math.abs(dx) > 0.5) {
        const slope = dy / dx;
        lx2 = svgW; ly2 = y1 + slope * (svgW - x1);
      }
      const rayBaseW = drawing.lineWidth || 1.5;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", x1); el.setAttribute("y1", y1);
      el.setAttribute("x2", lx2); el.setAttribute("y2", ly2);
      el.setAttribute("stroke", selStroke(drawing.color || "#089981", drawing.id));
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(rayBaseW + 1) : String(rayBaseW));
      if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
      el.style.pointerEvents = "stroke";
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
      svg.appendChild(el);

      // Limited endpoint (dot) at the start point
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", x1); dot.setAttribute("cy", y1); dot.setAttribute("r", "3");
      dot.setAttribute("fill", selStroke(drawing.color || "#089981", drawing.id));
      dot.style.pointerEvents = "none";
      svg.appendChild(dot);

      // Unlimited endpoint (arrow) at the right edge pointing right
      if (lx2 >= svgW - 5) {
        const endpointColor = selStroke(drawing.color || "#089981", drawing.id);
        const arrowSize = 5;
        const angle = Math.atan2(dy, dx);
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const a1x = lx2 + Math.cos(angle - Math.PI / 6) * arrowSize * 1.5;
        const a1y = ly2 + Math.sin(angle - Math.PI / 6) * arrowSize * 1.5;
        const a2x = lx2 + Math.cos(angle + Math.PI / 6) * arrowSize * 1.5;
        const a2y = ly2 + Math.sin(angle + Math.PI / 6) * arrowSize * 1.5;
        arrow.setAttribute("points", `${lx2},${ly2} ${a1x},${a1y} ${a2x},${a2y}`);
        arrow.setAttribute("fill", endpointColor);
        arrow.style.pointerEvents = "none";
        svg.appendChild(arrow);
      }

      return;
    }

    // ── Trendline — extends across full chart width (unlimited on both ends) ──
    if (drawing.type === "trendline") {
      const x1 = ts.timeToCoordinate(drawing.p1.time);
      const y1 = mn.priceToCoordinate(drawing.p1.price);
      const x2 = ts.timeToCoordinate(drawing.p2.time);
      const y2 = mn.priceToCoordinate(drawing.p2.price);
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;
      const dx = x2 - x1, dy = y2 - y1;
      let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
      if (Math.abs(dx) > 0.5) {
        const slope = dy / dx;
        lx1 = 0;    ly1 = y1 + slope * (0 - x1);
        lx2 = svgW; ly2 = y1 + slope * (svgW - x1);
      }
      const trendBaseW = drawing.lineWidth || 1.5;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", lx1); el.setAttribute("y1", ly1);
      el.setAttribute("x2", lx2); el.setAttribute("y2", ly2);
      el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5", drawing.id));
      el.setAttribute("stroke-width", isSelected(drawing.id) ? String(trendBaseW + 1) : String(trendBaseW));
      if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
      el.style.pointerEvents = "stroke";
      applyGlow(el, drawing.id);
      attachInteraction(el, drawing);
      attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
      svg.appendChild(el);

      // Control points at the two clicked locations
      [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
        dot.setAttribute("fill", selStroke(drawing.color || "#1E53E5", drawing.id));
        dot.style.pointerEvents = "none";
        svg.appendChild(dot);
      });

      // Add directional arrows at chart edges to indicate unlimited extension
      const endpointColor = selStroke(drawing.color || "#1E53E5", drawing.id);
      const arrowSize = 5;

      // Calculate arrow direction from slope
      const angle = Math.atan2(dy, dx);

      // Left arrow (pointing in the direction of the line extension)
      if (lx1 <= 5) {
        const arrowAngle = angle + Math.PI; // pointing left along the line
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const a1x = lx1 + Math.cos(arrowAngle - Math.PI / 6) * arrowSize * 1.5;
        const a1y = ly1 + Math.sin(arrowAngle - Math.PI / 6) * arrowSize * 1.5;
        const a2x = lx1 + Math.cos(arrowAngle + Math.PI / 6) * arrowSize * 1.5;
        const a2y = ly1 + Math.sin(arrowAngle + Math.PI / 6) * arrowSize * 1.5;
        arrow.setAttribute("points", `${lx1},${ly1} ${a1x},${a1y} ${a2x},${a2y}`);
        arrow.setAttribute("fill", endpointColor);
        arrow.style.pointerEvents = "none";
        svg.appendChild(arrow);
      }

      // Right arrow (pointing in the direction of the line extension)
      if (lx2 >= svgW - 5) {
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const a1x = lx2 + Math.cos(angle - Math.PI / 6) * arrowSize * 1.5;
        const a1y = ly2 + Math.sin(angle - Math.PI / 6) * arrowSize * 1.5;
        const a2x = lx2 + Math.cos(angle + Math.PI / 6) * arrowSize * 1.5;
        const a2y = ly2 + Math.sin(angle + Math.PI / 6) * arrowSize * 1.5;
        arrow.setAttribute("points", `${lx2},${ly2} ${a1x},${a1y} ${a2x},${a2y}`);
        arrow.setAttribute("fill", endpointColor);
        arrow.style.pointerEvents = "none";
        svg.appendChild(arrow);
      }

      return;
    }

    // ── Fibonacci retracement ──
    if (drawing.type === "fibonacci") {
      const x1 = ts.timeToCoordinate(drawing.p1.time);
      const x2 = ts.timeToCoordinate(drawing.p2.time);
      if (x1 == null || x2 == null) return;
      const lx1 = Math.min(x1, x2), lx2 = Math.max(x1, x2);
      const priceRange = drawing.p2.price - drawing.p1.price;
      const FIB_LEVELS = [
        { r: 0,     color: "#787b86" },
        { r: 0.236, color: "#089981" },
        { r: 0.382, color: "#089981" },
        { r: 0.5,   color: "#f7a600" },
        { r: 0.618, color: "#089981" },
        { r: 0.786, color: "#089981" },
        { r: 1.0,   color: "#787b86" },
      ];
      const selected = isSelected(drawing.id);
      FIB_LEVELS.forEach(({ r, color }) => {
        const fibPrice = drawing.p1.price + priceRange * r;
        const fy = mn.priceToCoordinate(fibPrice);
        if (fy == null) return;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", lx1); line.setAttribute("y1", fy);
        line.setAttribute("x2", lx2); line.setAttribute("y2", fy);
        line.setAttribute("stroke", selected ? "#60a5fa" : color);
        line.setAttribute("stroke-width", selected ? "2" : "1");
        line.setAttribute("stroke-dasharray", (r === 0 || r === 1) ? "" : "4,3");
        line.style.pointerEvents = "stroke";
        attachInteraction(line, drawing);
        attachMoveDrag(line, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
        svg.appendChild(line);
        // Label
        const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        lbl.setAttribute("x", lx1 + 4); lbl.setAttribute("y", fy - 2);
        lbl.setAttribute("fill", selected ? "#60a5fa" : color);
        lbl.setAttribute("font-size", "9");
        lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
        lbl.setAttribute("font-weight", "600");
        lbl.textContent = `${(r * 100).toFixed(1)}%  ${fibPrice.toFixed(2)}`;
        lbl.style.pointerEvents = "none";
        svg.appendChild(lbl);
      });

      if (selected) {
        const mkFibHandle = (hx, hy, field, anchorPrice) => {
          const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          h.setAttribute("cx", hx); h.setAttribute("cy", hy); h.setAttribute("r", "5");
          h.setAttribute("fill", isDark ? "#131722" : "#ffffff");
          h.setAttribute("stroke", drawing.color || "#087b86");
          h.setAttribute("stroke-width", "2");
          h.style.cursor = "crosshair";
          h.style.pointerEvents = "all";
          h.addEventListener("mousedown", (ev) => {
            ev.stopPropagation();
            if (refs.svgDraggingRef) {
              refs.svgDraggingRef.current = {
                drawingId: drawing.id,
                field,
                drawingType: "fibonacci",
                candleInterval: interval,
                visualP2Time: drawing.p2.time,
                p1Time: drawing.p1.time,
                anchorPrice,
              };
            }
          });
          svg.appendChild(h);
        };
        const p1y = mn.priceToCoordinate(drawing.p1.price);
        const p2y = mn.priceToCoordinate(drawing.p2.price);
        if (p1y != null) mkFibHandle(lx1, p1y, "p1", drawing.p2.price);
        if (p1y != null) mkFibHandle(lx2, p1y, "p1", drawing.p2.price);
        if (p2y != null) mkFibHandle(lx1, p2y, "p2", drawing.p1.price);
        if (p2y != null) mkFibHandle(lx2, p2y, "p2", drawing.p1.price);
      }

      return;
    }

    // ── Buy / Sell position markers ──
    if (drawing.type === "buy_marker" || drawing.type === "sell_marker") {
      const x = ts.timeToCoordinate(drawing.time);
      const y = mn.priceToCoordinate(drawing.price);
      if (x == null || y == null) return;
      const isBuy = drawing.type === "buy_marker";
      const col = selected => selected ? "#60a5fa" : (isBuy ? "#089981" : "#f23645");
      const color = col(isSelected(drawing.id));
      // Triangle: buy = arrow below price pointing up, sell = arrow above pointing down
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      const pts = isBuy
        ? `${x},${y + 2} ${x - 7},${y + 14} ${x + 7},${y + 14}`
        : `${x},${y - 2} ${x - 7},${y - 14} ${x + 7},${y - 14}`;
      arrow.setAttribute("points", pts);
      arrow.setAttribute("fill", color);
      arrow.style.cursor = "pointer";
      arrow.style.pointerEvents = "all";
      applyGlow(arrow, drawing.id);
      attachInteraction(arrow, drawing);
      svg.appendChild(arrow);
      // Label
      const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lbl.setAttribute("x", x); lbl.setAttribute("y", isBuy ? y + 24 : y - 18);
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("fill", color);
      lbl.setAttribute("font-size", "9");
      lbl.setAttribute("font-weight", "700");
      lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
      lbl.textContent = isBuy ? "B" : "S";
      lbl.style.pointerEvents = "none";
      svg.appendChild(lbl);
      return;
    }

    // ── Risk/Reward box — two colored rectangles, width controlled by endTime ──
    if (drawing.type === "rr") {
      const x = ts.timeToCoordinate(drawing.time);
      if (x == null) return;
      const xEndRaw = drawing.endTime ? ts.timeToCoordinate(drawing.endTime) : null;
      const xEnd = xEndRaw ?? svgW;
      if (xEnd <= x) return;
      const yEntry = mn.priceToCoordinate(drawing.entry);
      const ySL    = mn.priceToCoordinate(drawing.sl);
      const yTP    = mn.priceToCoordinate(drawing.tp);
      if (yEntry == null || ySL == null || yTP == null) return;
      const sel = isSelected(drawing.id);
      const sw = sel ? "2" : "1";

      const risk   = Math.abs(drawing.entry - drawing.sl);
      const reward = Math.abs(drawing.tp - drawing.entry);
      const ratio  = risk > 0 ? (reward / risk).toFixed(1) : "—";
      const slPct  = risk   > 0 ? ((risk   / drawing.entry) * 100).toFixed(3) : "0.000";
      const tpPct  = reward > 0 ? ((reward / drawing.entry) * 100).toFixed(3) : "0.000";
      const size   = drawing.size ?? 1;
      const slAmt  = Math.round(risk   * size);
      const tpAmt  = Math.round(reward * size);
      const inDrawMode = !!drawingMode;

      // Use actual price coordinates for zones — scales proportionally with chart
      const ySLv = ySL;
      const yTPv = yTP;

      // Container group — CSS :hover shows rr-labels and rr-handles sub-groups
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", sel ? "rr-group rr-selected" : "rr-group");
      if (inDrawMode) group.style.pointerEvents = "none";

      // Always-visible colored zones
      const mkRect = (yA, yB, fillColor, strokeColor) => {
        const top = Math.min(yA, yB), h = Math.abs(yB - yA);
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", x); r.setAttribute("y", top);
        r.setAttribute("width", xEnd - x); r.setAttribute("height", Math.max(h, 1));
        r.setAttribute("fill", fillColor);
        r.setAttribute("stroke", strokeColor); r.setAttribute("stroke-width", sw);
        if (!inDrawMode) {
          r.style.cursor = "pointer"; r.style.pointerEvents = "all";
          attachInteraction(r, drawing);
        } else {
          r.style.pointerEvents = "none";
        }
        group.appendChild(r);
      };
      mkRect(yEntry, ySLv,
        sel ? "rgba(242,54,69,0.28)" : "rgba(242,54,69,0.18)",
        sel ? "#f23645" : "rgba(242,54,69,0.45)");
      mkRect(yEntry, yTPv,
        sel ? "rgba(8,153,129,0.28)" : "rgba(8,153,129,0.18)",
        sel ? "#089981" : "rgba(8,153,129,0.45)");

      // Boundary lines (always visible)
      const mkLine = (y1, stroke, dash) => {
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", x); ln.setAttribute("y1", y1);
        ln.setAttribute("x2", xEnd); ln.setAttribute("y2", y1);
        ln.setAttribute("stroke", stroke); ln.setAttribute("stroke-width", sw);
        if (dash) ln.setAttribute("stroke-dasharray", dash);
        ln.style.pointerEvents = "none";
        group.appendChild(ln);
      };
      mkLine(yEntry, sel ? "#60a5fa" : "rgba(255,255,255,0.7)", "6,3");
      mkLine(ySLv, sel ? "#60a5fa" : "rgba(242,54,69,0.85)");
      mkLine(yTPv, sel ? "#60a5fa" : "rgba(8,153,129,0.85)");

      // Labels — in sub-group, CSS controls visibility on hover / selected
      const labelsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelsG.setAttribute("class", "rr-labels");
      const fontFam = "'Inter','Trebuchet MS',sans-serif";
      // Smaller font; labels sit to the LEFT of the box so they don't overlap the zones
      const fontSize = 8, lineH = 11, padX = 5, padY = 3, charW = 4.5;
      const mkPill = (lines, anchorY, bgColor) => {
        const pillW = Math.max(...lines.map((l) => l.length)) * charW + padX * 2;
        const pillH = lines.length * lineH + padY * 2;
        // Place to the right of the drawing; clamp so it doesn't go off-screen right
        const pillX = Math.min(xEnd + 6, svgW - pillW - 2);
        const pillY = anchorY - pillH / 2;
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", pillX); bg.setAttribute("y", pillY);
        bg.setAttribute("width", pillW); bg.setAttribute("height", pillH);
        bg.setAttribute("rx", "3"); bg.setAttribute("ry", "3");
        bg.setAttribute("fill", bgColor); bg.style.pointerEvents = "none";
        labelsG.appendChild(bg);
        lines.forEach((line, i) => {
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", pillX + padX);
          t.setAttribute("y", pillY + padY + (i + 1) * lineH - 2);
          t.setAttribute("fill", "#fff"); t.setAttribute("font-size", fontSize);
          t.setAttribute("font-family", fontFam); t.setAttribute("font-weight", "600");
          t.textContent = line; t.style.pointerEvents = "none";
          labelsG.appendChild(t);
        });
      };
      mkPill([`Target: ${drawing.tp.toFixed(2)} (${tpPct}%) ${reward.toFixed(2)}, Amt: ${tpAmt}`], yTPv, "#089981");
      mkPill([`P&L: 0  Qty: ${size}  R:R ${ratio}`], yEntry, "#f23645");
      mkPill([`Stop: ${drawing.sl.toFixed(2)} (${slPct}%) ${risk.toFixed(2)}, Amt: ${slAmt}`], ySLv, "#f23645");
      group.appendChild(labelsG);

      // Handles — in sub-group, CSS controls visibility; hidden entirely in draw mode
      // Handles use actual price coordinates (ySL/yTP) so dragging still tracks real price
      if (!inDrawMode) {
        const handlesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        handlesG.setAttribute("class", "rr-handles");
        const midY = (Math.min(yEntry, yTPv) + Math.max(yEntry, ySLv)) / 2;
        const midX = (x + xEnd) / 2;
        const mkHandle = (hx, hy, cursor, field, color) => {
          const hw = 8;
          const h = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          h.setAttribute("x", hx - hw / 2); h.setAttribute("y", hy - hw / 2);
          h.setAttribute("width", hw); h.setAttribute("height", hw);
          h.setAttribute("rx", "1"); h.setAttribute("ry", "1");
          h.setAttribute("fill", color);
          h.setAttribute("stroke", "#fff"); h.setAttribute("stroke-width", "1.5");
          h.style.cursor = cursor; h.style.pointerEvents = "all";
          h.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            if (refs.svgDraggingRef) {
              refs.svgDraggingRef.current = { drawingId: drawing.id, field };
            }
          });
          handlesG.appendChild(h);
        };
        mkHandle(xEnd, midY,  "ew-resize", "endTime", "#1E53E5");
        mkHandle(midX, ySLv, "ns-resize", "sl",      "#f23645"); // visual pos; drag maps back to price
        mkHandle(midX, yTPv, "ns-resize", "tp",      "#089981");
        group.appendChild(handlesG);
      }

      svg.appendChild(group);
      return;
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Dashed preview while placing second point for trendline/ray/rectangle/fibonacci/rr
  // ────────────────────────────────────────────────────────────────────
  const mode = drawingMode;
  const twoPointModes = ["trendline", "ray", "segment", "rectangle", "fibonacci", "rr"];
  if (twoPointModes.includes(mode) && drawingState && previewPoint) {
    const p1 = drawingState;
    const ax = ts.timeToCoordinate(p1.time);
    const ay = mn.priceToCoordinate(p1.price);
    if (ax != null && ay != null) {
      if (mode === "rectangle") {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const rx = Math.min(ax, previewPoint.x);
        const ry = Math.min(ay, previewPoint.y);
        const rw = Math.abs(previewPoint.x - ax);
        const rh = Math.abs(previewPoint.y - ay);
        el.setAttribute("x", rx); el.setAttribute("y", ry);
        el.setAttribute("width", rw); el.setAttribute("height", rh);
        el.setAttribute("stroke", "#1E53E5");
        el.setAttribute("stroke-width", "1.5");
        el.setAttribute("stroke-dasharray", "5,4");
        el.setAttribute("fill", "rgba(30,83,229,0.04)");
        el.style.pointerEvents = "none";
        svg.appendChild(el);
      } else if (mode === "fibonacci") {
        // Preview fib as two vertical markers connected by a bracket
        const px2 = previewPoint.x;
        const lx1p = Math.min(ax, px2), lx2p = Math.max(ax, px2);
        const previewLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const previewPrice2 = mn.coordinateToPrice(previewPoint.y);
        if (previewPrice2 != null) {
          const priceRange = previewPrice2 - p1.price;
          previewLevels.forEach((r) => {
            const fp = p1.price + priceRange * r;
            const fy = mn.priceToCoordinate(fp);
            if (fy == null) return;
            const pl = document.createElementNS("http://www.w3.org/2000/svg", "line");
            pl.setAttribute("x1", lx1p); pl.setAttribute("y1", fy);
            pl.setAttribute("x2", lx2p); pl.setAttribute("y2", fy);
            pl.setAttribute("stroke", "#1E53E5");
            pl.setAttribute("stroke-width", "1");
            pl.setAttribute("stroke-dasharray", "4,3");
            pl.setAttribute("opacity", "0.6");
            pl.style.pointerEvents = "none";
            svg.appendChild(pl);
          });
        }
      } else if (mode === "rr") {
        const slPrice = mn.coordinateToPrice(previewPoint.y);
        if (slPrice != null) {
          const entry = p1.price;
          const risk = Math.abs(entry - slPrice);
          const isLong = slPrice < entry;
          const tpPrice = isLong ? entry + risk * 2 : entry - risk * 2;
          const ySL = previewPoint.y;
          const yTP = mn.priceToCoordinate(tpPrice);
          if (yTP != null) {
            const previewRight = previewPoint.x;
            const mkPreviewRect = (yA, yB, fill) => {
              const top = Math.min(yA, yB), h = Math.abs(yB - yA);
              const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              r.setAttribute("x", ax); r.setAttribute("y", top);
              r.setAttribute("width", Math.max(previewRight - ax, 1)); r.setAttribute("height", Math.max(h, 1));
              r.setAttribute("fill", fill); r.setAttribute("stroke-width", "1");
              r.setAttribute("stroke-dasharray", "5,4"); r.style.pointerEvents = "none";
              svg.appendChild(r);
            };
            mkPreviewRect(ay, ySL, "rgba(242,54,69,0.12)");
            mkPreviewRect(ay, yTP, "rgba(8,153,129,0.12)");
            // Entry line preview — stops at cursor x
            const eL = document.createElementNS("http://www.w3.org/2000/svg", "line");
            eL.setAttribute("x1", ax); eL.setAttribute("y1", ay);
            eL.setAttribute("x2", previewRight); eL.setAttribute("y2", ay);
            eL.setAttribute("stroke", "rgba(255,255,255,0.5)"); eL.setAttribute("stroke-width", "1");
            eL.setAttribute("stroke-dasharray", "5,4"); eL.style.pointerEvents = "none";
            svg.appendChild(eL);
          }
        }
      } else {
        let bx = previewPoint.x, by = previewPoint.y;
        if (shiftKey && ["trendline", "ray", "segment"].includes(mode)) {
          const dx = bx - ax, dy = by - ay;
          const adx = Math.abs(dx), ady = Math.abs(dy);
          if (adx > ady * 2.414)      { by = ay; }
          else if (ady > adx * 2.414) { bx = ax; }
          else { const d = Math.max(adx, ady); bx = ax + (dx >= 0 ? d : -d); by = ay + (dy >= 0 ? d : -d); }
        }
        const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
        el.setAttribute("x1", ax); el.setAttribute("y1", ay);
        el.setAttribute("x2", bx);
        el.setAttribute("y2", by);
        const previewColor = mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#1E53E5";
        el.setAttribute("stroke", previewColor);
        el.setAttribute("stroke-width", "1.5");
        el.setAttribute("stroke-dasharray", "5,4");
        el.style.pointerEvents = "none";
        svg.appendChild(el);
      }
      const previewDotColor = mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#1E53E5";
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", ax); dot.setAttribute("cy", ay); dot.setAttribute("r", "3");
      dot.setAttribute("fill", previewDotColor);
      dot.style.pointerEvents = "none";
      svg.appendChild(dot);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Replay position indicator — vertical line showing current replay cut position
  // ────────────────────────────────────────────────────────────────────
  if (barReplayActive && candleData?.length > 0) {
    const replayIdx = (visibleCount || 1) - 1;
    if (replayIdx >= 0 && replayIdx < candleData.length) {
      const replayTime = candleData[replayIdx].time;
      const x = ts.timeToCoordinate(replayTime);
      if (x != null) {
        const replayLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        replayLine.setAttribute("x1", x);
        replayLine.setAttribute("y1", 0);
        replayLine.setAttribute("x2", x);
        replayLine.setAttribute("y2", svgH);
        replayLine.setAttribute("stroke", "#1E53E5");
        replayLine.setAttribute("stroke-width", "2");
        replayLine.setAttribute("stroke-dasharray", "6,4");
        replayLine.setAttribute("opacity", "0.7");
        replayLine.style.pointerEvents = "none";
        svg.appendChild(replayLine);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Position the properties panel above the selected drawing
  // ────────────────────────────────────────────────────────────────────
  const panel = propsPanel;
  if (panel) {
    const selIds = selectedDrawingIds;
    const LINE_TYPES = ["segment", "trendline", "ray", "hline", "vline", "text", "fibonacci", "rr"];
    if (selIds.length === 1) {
      const selD = userDrawings.find((d) => d.id === selIds[0]);
      if (selD && LINE_TYPES.includes(selD.type)) {
        const pw = panel.offsetWidth || 260;
        const ph = panel.offsetHeight || 80;
        const svgRect = svg.getBoundingClientRect();

        // Calculate drawing position in screen coordinates
        let drawingX, drawingY;

        if (selD.type === "hline") {
          // For horizontal line, use center x and line y
          drawingX = svgRect.left + svgRect.width / 2;
          const lineY = mn.priceToCoordinate(selD.price);
          drawingY = svgRect.top + (lineY ?? svgRect.height / 2);
        } else if (selD.type === "vline") {
          // For vertical line, use line x and center y
          const lineX = ts.timeToCoordinate(selD.time);
          drawingX = svgRect.left + (lineX ?? svgRect.width / 2);
          drawingY = svgRect.top + svgRect.height / 2;
        } else if (selD.type === "text") {
          // For text, use exact position
          const textX = ts.timeToCoordinate(selD.time);
          const textY = mn.priceToCoordinate(selD.price);
          drawingX = svgRect.left + (textX ?? svgRect.width / 2);
          drawingY = svgRect.top + (textY ?? svgRect.height / 2);
        } else if (selD.type === "fibonacci" || selD.type === "rr") {
          // For fibonacci and rr, use midpoint
          const x1 = ts.timeToCoordinate(selD.p1.time);
          const y1 = mn.priceToCoordinate(selD.p1.price);
          const x2 = ts.timeToCoordinate(selD.p2.time);
          const y2 = mn.priceToCoordinate(selD.p2.price);
          drawingX = svgRect.left + ((x1 ?? 0) + (x2 ?? 0)) / 2;
          drawingY = svgRect.top + ((y1 ?? 0) + (y2 ?? 0)) / 2;
        } else {
          // For segment, trendline, ray - use first point
          const x1 = ts.timeToCoordinate(selD.p1.time);
          const y1 = mn.priceToCoordinate(selD.p1.price);
          drawingX = svgRect.left + (x1 ?? svgRect.width / 2);
          drawingY = svgRect.top + (y1 ?? svgRect.height / 2);
        }

        // Position panel above the drawing with some margin
        const margin = 10;
        let fl = drawingX - pw / 2;
        let ft = drawingY - ph - margin;

        // Keep panel within screen bounds
        fl = Math.max(margin, Math.min(fl, window.innerWidth - pw - margin));
        ft = Math.max(margin, Math.min(ft, window.innerHeight - ph - margin));

        panel.style.left = `${Math.round(fl)}px`;
        panel.style.top  = `${Math.round(ft)}px`;
      }
    }
  }
}

/**
 * Helper function: Attach move drag handler to SVG element
 * This is exported separately in case it needs to be used independently
 */
export function attachMoveDrag(el, drawing, extraState, refs, drawingMode, svgRef, chartRef, seriesRef, candleData) {
  const interval = candleData?.length > 1 ? candleData[1].time - candleData[0].time : 3600;

  el.style.cursor = "move";
  el.addEventListener("mousedown", (e) => {
    if (drawingMode) return;
    e.stopPropagation();
    const svgEl = svgRef;
    const svgRect = svgEl?.getBoundingClientRect();
    const ch = chartRef;
    const mn2 = seriesRef.main;
    const startLogical = ch?.timeScale().coordinateToLogical(e.clientX - (svgRect?.left ?? 0)) ?? 0;
    const startPrice   = mn2?.coordinateToPrice(e.clientY - (svgRect?.top ?? 0)) ?? 0;

    if (refs.svgDraggingRef) {
      refs.svgDraggingRef.current = {
        drawingId: drawing.id,
        field: "move",
        drawingType: drawing.type,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startLogical,
        startPrice,
        candleInterval: interval,
        hasMoved: false,
        ...extraState,
      };
    }
  });
}

/**
 * Helper function: Attach interaction (click for select/delete) to SVG element
 * This is exported separately in case it needs to be used independently
 */
export function attachInteraction(el, drawing, wasDragged, drawingMode, onDrawingDelete, onSelectionChange, refs) {
  el.addEventListener("click", (e) => {
    if (wasDragged) {
      if (refs.wasDraggedRef) refs.wasDraggedRef.current = false;
      return;
    }
    e.stopPropagation();
    if (drawingMode === "eraser") {
      onDrawingDelete?.(drawing.id);
    } else if (!drawingMode || drawingMode === "selector") {
      onSelectionChange?.(drawing.id, e.ctrlKey || e.metaKey || e.shiftKey);
    }
  });
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}
