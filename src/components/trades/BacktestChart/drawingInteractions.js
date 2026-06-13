/**
 * drawingInteractions.js
 *
 * Pure JavaScript module for handling all drawing interaction logic in BacktestChart:
 * - SVG drawing drag handlers (position line dragging, order preview dragging)
 * - Global mousemove and mouseup handlers for drag operations
 * - Position price line (TP/SL/Entry) drag synchronization
 * - Order preview line drag synchronization
 *
 * Extracted from BacktestChart.jsx to improve code organization and maintainability.
 */

/**
 * Sets up SVG drawing drag interactions (R/R handles, Fibonacci handles, move operations)
 * This is the global document-level mousemove/mouseup handler for SVG drawing drags.
 *
 * @param {Object} refs - Object containing React refs needed for drag operations
 * @param {React.RefObject} refs.svgDraggingRef - Ref tracking current drag state
 * @param {React.RefObject} refs.wasDraggedRef - Ref tracking if drag occurred (suppresses click)
 * @param {React.RefObject} refs.svgRef - Ref to the SVG element
 * @param {React.RefObject} refs.seriesRef - Ref to chart series (main candlestick series)
 * @param {React.RefObject} refs.chartRef - Ref to the TradingView chart instance
 * @param {React.RefObject} refs.onDrawingUpdateRef - Ref to the drawing update callback
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupDrawingInteractions(refs) {
  const {
    svgDraggingRef,
    wasDraggedRef,
    svgRef,
    seriesRef,
    chartRef,
    onDrawingUpdateRef,
  } = refs;

  const onMove = (e) => {
    const drag = svgDraggingRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    const main = seriesRef.current.main;
    const chart = chartRef.current;
    if (!svg || !main || !chart) return;
    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;

    // Handle R/R box drag handles: SL and TP price lines
    if (drag.field === "sl" || drag.field === "tp") {
      const p = main.coordinateToPrice(y);
      if (p != null) onDrawingUpdateRef.current?.(drag.drawingId, { [drag.field]: p });
    }
    // Handle R/R box drag handle: endTime (right edge of box)
    else if (drag.field === "endTime") {
      const t = chart.timeScale().coordinateToTime?.(x);
      if (t != null) onDrawingUpdateRef.current?.(drag.drawingId, { endTime: Number(t) });
    }
    // Handle Fibonacci retracement drag handles: p1 or p2
    else if (drag.field === "p1" || drag.field === "p2") {
      const rawT = chart.timeScale().coordinateToTime?.(x);
      const p = main.coordinateToPrice(y);
      if (rawT != null && p != null) {
        const newTime = Number(rawT);
        if (drag.field === "p1") {
          onDrawingUpdateRef.current?.(drag.drawingId, { p1: { time: newTime, price: p } });
        } else {
          onDrawingUpdateRef.current?.(drag.drawingId, { p2: { time: newTime, price: p } });
        }
      }
    }
    // Handle move operation (dragging entire drawing to new position)
    else if (drag.field === "move") {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      // Ignore tiny movements (prevent accidental drags)
      if (!drag.hasMoved && Math.abs(dx) + Math.abs(dy) < 5) return;
      drag.hasMoved = true;

      const logicalNow = chart.timeScale().coordinateToLogical(x) ?? drag.startLogical;
      const timeDelta  = Math.round((logicalNow - drag.startLogical) * drag.candleInterval);
      const priceNow   = main.coordinateToPrice(y) ?? drag.startPrice;
      const priceDelta = priceNow - drag.startPrice;

      // Move freehand brush stroke
      if (drag.drawingType === "freehand") {
        if (drag.startPoints) {
          const dLogical = logicalNow - drag.startLogical;
          const newPoints = drag.startPoints.map(({ logicalIdx, price }) => ({
            logicalIdx: logicalIdx + dLogical,
            price: price + priceDelta,
          }));
          onDrawingUpdateRef.current?.(drag.drawingId, { points: newPoints });
        }
      }
      // Move vertical line
      else if (drag.drawingType === "vline") {
        onDrawingUpdateRef.current?.(drag.drawingId, { time: drag.startTime + timeDelta });
      }
      // Move text label
      else if (drag.drawingType === "text") {
        onDrawingUpdateRef.current?.(drag.drawingId, {
          time:  drag.startP1.time  + timeDelta,
          price: drag.startP1.price + priceDelta,
        });
      }
      // Move any two-point drawing (trendline, ray, segment, rectangle, fibonacci)
      else if (drag.startP1 && drag.startP2) {
        onDrawingUpdateRef.current?.(drag.drawingId, {
          p1: { time: drag.startP1.time + timeDelta, price: drag.startP1.price + priceDelta },
          p2: { time: drag.startP2.time + timeDelta, price: drag.startP2.price + priceDelta },
        });
      }
    }
  };

  const onUp = () => {
    wasDraggedRef.current = svgDraggingRef.current?.hasMoved ?? false;
    svgDraggingRef.current = null;
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);

  return () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
}

/**
 * Sets up position price line and order preview line drag synchronization.
 * Reads the dragged price from TradingView price lines after mouseup and syncs back to React state.
 *
 * This handler fires on mouseup anywhere in the chart container and reads the current
 * price from each draggable price line (TP, SL for positions; TP, SL for order previews).
 *
 * @param {Object} refs - Object containing React refs needed for sync
 * @param {React.RefObject} refs.wrapperRef - Ref to the chart wrapper container
 * @param {React.RefObject} refs.positionLineRefs - Ref to array of position price lines
 * @param {React.RefObject} refs.previewLineRefs - Ref to array of order preview price lines
 * @param {React.RefObject} refs.onPositionUpdateRef - Ref to position update callback
 * @param {React.RefObject} refs.onOrderPreviewUpdateRef - Ref to order preview update callback
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupPriceLineDragSync(refs) {
  const {
    wrapperRef,
    positionLineRefs,
    previewLineRefs,
    onPositionUpdateRef,
    onOrderPreviewUpdateRef,
  } = refs;

  const container = wrapperRef.current;
  if (!container) return () => {};

  const onMouseUp = () => {
    // Sync position price lines (TP, SL) — read from TradingView line back to React state
    if (onPositionUpdateRef.current) {
      positionLineRefs.current.forEach(({ line, posId, field }) => {
        if (field === "entry") return; // entry line is not draggable
        try {
          const newPrice = line.options().price;
          if (typeof newPrice === "number" && isFinite(newPrice)) {
            onPositionUpdateRef.current(posId, field, String(newPrice));
          }
        } catch {}
      });
    }

    // Sync order preview price lines (TP, SL) — read from TradingView line back to React state
    if (onOrderPreviewUpdateRef.current) {
      previewLineRefs.current.forEach(({ line, field }) => {
        if (field === "entry") return; // entry line is not draggable
        try {
          const newPrice = line.options().price;
          if (typeof newPrice === "number" && isFinite(newPrice)) {
            onOrderPreviewUpdateRef.current(field, newPrice);
          }
        } catch {}
      });
    }
  };

  container.addEventListener("mouseup", onMouseUp);

  return () => container.removeEventListener("mouseup", onMouseUp);
}

/**
 * Initializes SVG drag state for a drawing element.
 * Called on mousedown to start a drag operation (move entire drawing).
 *
 * @param {Object} params - Drag initialization parameters
 * @param {MouseEvent} params.e - The mousedown event
 * @param {Object} params.drawing - The drawing object being dragged
 * @param {number} params.interval - Candle interval in seconds
 * @param {Object} params.extraState - Additional state to store (startP1, startP2, startPoints, etc.)
 * @param {React.RefObject} params.svgRef - Ref to the SVG element
 * @param {React.RefObject} params.chartRef - Ref to the TradingView chart instance
 * @param {React.RefObject} params.seriesRef - Ref to chart series
 * @param {React.RefObject} params.svgDraggingRef - Ref to store drag state
 */
export function initializeDragState(params) {
  const { e, drawing, interval, extraState, svgRef, chartRef, seriesRef, svgDraggingRef } = params;

  const svgEl = svgRef.current;
  const svgRect = svgEl?.getBoundingClientRect();
  const ch = chartRef.current;
  const mn = seriesRef.current.main;
  const startLogical = ch?.timeScale().coordinateToLogical(e.clientX - (svgRect?.left ?? 0)) ?? 0;
  const startPrice   = mn?.coordinateToPrice(e.clientY - (svgRect?.top ?? 0)) ?? 0;

  svgDraggingRef.current = {
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

/**
 * Initializes drag state for R/R box handles (SL, TP, endTime).
 * Called on mousedown on a R/R drag handle circle.
 *
 * @param {Object} params - Handle drag initialization parameters
 * @param {string} params.drawingId - The drawing ID
 * @param {string} params.field - The field being dragged ("sl", "tp", or "endTime")
 * @param {React.RefObject} params.svgDraggingRef - Ref to store drag state
 */
export function initializeHandleDrag(params) {
  const { drawingId, field, svgDraggingRef } = params;
  svgDraggingRef.current = { drawingId, field };
}

/**
 * Initializes drag state for Fibonacci retracement handles (p1, p2).
 * Called on mousedown on a Fibonacci drag handle circle.
 *
 * @param {Object} params - Fibonacci handle drag initialization parameters
 * @param {string} params.drawingId - The drawing ID
 * @param {string} params.field - The field being dragged ("p1" or "p2")
 * @param {number} params.interval - Candle interval in seconds
 * @param {number} params.visualP2Time - The visual p2 time coordinate
 * @param {number} params.p1Time - The p1 time coordinate
 * @param {number} params.anchorPrice - The anchor price for the handle
 * @param {React.RefObject} params.svgDraggingRef - Ref to store drag state
 */
export function initializeFibonacciHandleDrag(params) {
  const { drawingId, field, interval, visualP2Time, p1Time, anchorPrice, svgDraggingRef } = params;
  svgDraggingRef.current = {
    drawingId,
    field,
    drawingType: "fibonacci",
    candleInterval: interval,
    visualP2Time,
    p1Time,
    anchorPrice,
  };
}
