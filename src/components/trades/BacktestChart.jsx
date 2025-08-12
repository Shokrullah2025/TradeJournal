import React, { useEffect, useRef } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";

const BacktestChart = ({
  candleData,
  equityCurve,
  trades = [],
  width = "100%",
  height = 500,
  isDarkMode = false,
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    // Only create chart if candleData is valid and non-empty
    if (!candleData || !Array.isArray(candleData) || candleData.length === 0) {
      chartRef.current = null;
      return;
    }
    // Basic chart setup
    const chartOptions = {
      width: chartContainerRef.current.clientWidth || 800,
      height: height,
      layout: {
        background: { color: isDarkMode ? "#1e293b" : "#ffffff" },
        textColor: isDarkMode ? "#d1d5db" : "#191919",
      },
      grid: {
        vertLines: { color: isDarkMode ? "#334155" : "#f3f4f6" },
        horzLines: { color: isDarkMode ? "#334155" : "#f3f4f6" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: isDarkMode ? "#475569" : "#e5e7eb",
      },
      timeScale: {
        borderColor: isDarkMode ? "#475569" : "#e5e7eb",
        timeVisible: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    };

    // Create chart instance
    chartRef.current = createChart(chartContainerRef.current, chartOptions);
    if (
      !chartRef.current ||
      typeof chartRef.current.addCandlestickSeries !== "function"
    ) {
      console.error(
        "Chart instance is not valid or addCandlestickSeries is not a function:",
        chartRef.current
      );
      return;
    }
    chartRef.current = createChart(chartContainerRef.current, chartOptions);

    // Guard: Ensure chartRef.current is a valid chart before using chart API
    if (
      !chartRef.current ||
      typeof chartRef.current.addCandlestickSeries !== "function"
    ) {
      console.error(
        "Chart instance is not valid or addCandlestickSeries is not a function:",
        chartRef.current
      );
      return;
    }

    // Add window resize listener
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth || 800,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    let mainSeries = null;

    // Add price chart data if available
    if (candleData && candleData.length > 0) {
      mainSeries = chartRef.current.addCandlestickSeries({
        upColor: "#4ade80",
        downColor: "#f87171",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      mainSeries.setData(candleData);
    }

    // Add equity curve data if available
    if (equityCurve && equityCurve.length > 0) {
      const equitySeries = chartRef.current.addAreaSeries({
        lineColor: "#60a5fa",
        topColor: isDarkMode
          ? "rgba(59, 130, 246, 0.56)"
          : "rgba(96, 165, 250, 0.2)",
        bottomColor: isDarkMode
          ? "rgba(59, 130, 246, 0.04)"
          : "rgba(96, 165, 250, 0.0)",
        lineWidth: 2,
        priceScaleId: "equity",
      });

      // Format data for the chart
      const formattedEquityData = equityCurve.map((point) => ({
        time: point.date.getTime() / 1000,
        value: point.equity,
      }));

      equitySeries.setData(formattedEquityData);

      // Create separate scale for equity data
      chartRef.current.priceScale("equity").applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.3,
        },
      });
    }

    // Add trade markers if available
    if (candleData && trades.length > 0 && mainSeries) {
      const markers = trades
        .map((trade) => {
          const entryTime = new Date(trade.entryDate).getTime() / 1000;
          const exitTime = new Date(trade.exitDate).getTime() / 1000;

          // Find nearest candle time for entry and exit
          const entryCandle = candleData.reduce(
            (closest, candle) =>
              Math.abs(candle.time - entryTime) <
              Math.abs(closest.time - entryTime)
                ? candle
                : closest,
            candleData[0]
          );

          const exitCandle = candleData.reduce(
            (closest, candle) =>
              Math.abs(candle.time - exitTime) <
              Math.abs(closest.time - exitTime)
                ? candle
                : closest,
            candleData[0]
          );

          // Entry marker
          return [
            {
              time: entryCandle.time,
              position: trade.direction === "long" ? "belowBar" : "aboveBar",
              color: trade.direction === "long" ? "#22c55e" : "#ef4444",
              shape: trade.direction === "long" ? "arrowUp" : "arrowDown",
              text: `${trade.direction === "long" ? "Buy" : "Sell"} ${
                trade.instrument
              }`,
              size: 1,
            },
            {
              time: exitCandle.time,
              position: trade.direction === "long" ? "aboveBar" : "belowBar",
              color: trade.pnl > 0 ? "#22c55e" : "#ef4444",
              shape: trade.direction === "long" ? "arrowDown" : "arrowUp",
              text: `Exit ${trade.pnl > 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`,
              size: 1,
            },
          ];
        })
        .flat();

      if (markers.length > 0) {
        mainSeries.setMarkers(markers);
      }
    }

    // Initial time range
    chartRef.current.timeScale().fitContent();

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candleData, equityCurve, trades, height, isDarkMode]);

  return (
    <div className="w-full">
      <div ref={chartContainerRef} style={{ width: "100%" }} />
    </div>
  );
};

export default BacktestChart;
