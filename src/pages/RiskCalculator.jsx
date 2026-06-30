import React, { useState, useEffect } from "react";
import ModalPortal from "../components/common/ModalPortal";
import { TrendingUp, TrendingDown, Info, AlertTriangle, X } from "lucide-react";

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// Theme-aware palette — dark "trading terminal" / light "clean fintech"
const makePalette = (isDark) =>
  isDark
    ? {
        panel: "#0d1117",
        topbar: "#0f141b",
        left: "#0b0f15",
        card: "#11161e",
        border: "#20262f",
        borderSoft: "#1b212b",
        inputBorder: "#232b36",
        inputBg: "#11161e",
        segBg: "#10151d",
        text: "#e6edf3",
        textStrong: "#cdd4de",
        textMid: "#9aa3b2",
        muted: "#6b7686",
        divider: "#7c8696",
        axisLabel: "#5b6472",
        track: "#1b212b",
        gaugeMark: "#3a4452",
        green: "#2ebd85",
        red: "#f6465d",
        blue: "#5b9bff",
        segActiveText: "#06140d",
        btnText: "#06140d",
        tileGlow: "rgba(45,141,255,0.10)",
        tileAccent: "rgba(45,141,255,0.30)",
        shadow: "0 30px 60px -28px rgba(13,17,23,0.5)",
        infoBg: "rgba(45,141,255,0.07)",
        infoBorder: "rgba(45,141,255,0.16)",
        infoText: "#8ab4ff",
      }
    : {
        panel: "#ffffff",
        topbar: "#fafbfc",
        left: "#f7f8fa",
        card: "#fafbfc",
        border: "#e9ebf0",
        borderSoft: "#f0f1f4",
        inputBorder: "#e4e7ec",
        inputBg: "#ffffff",
        segBg: "#f4f5f8",
        text: "#0f172a",
        textStrong: "#334155",
        textMid: "#475569",
        muted: "#94a0b0",
        divider: "#94a0b0",
        axisLabel: "#94a0b0",
        track: "#e9ebf0",
        gaugeMark: "#cbd5e1",
        green: "#16a34a",
        red: "#e11d48",
        blue: "#2563eb",
        segActiveText: "#ffffff",
        btnText: "#ffffff",
        tileGlow: "rgba(37,99,235,0.07)",
        tileAccent: "rgba(37,99,235,0.30)",
        shadow: "0 24px 50px -30px rgba(15,23,42,0.25)",
        infoBg: "#eff4ff",
        infoBorder: "#dbe6ff",
        infoText: "#2563eb",
      };

const fmtMoney = (n) =>
  `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;
const fmtPrice = (n) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

// ---- Reusable dark/light terminal input (tightly coupled to this page) ----
const TerminalInput = ({
  c,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  dot,
  step,
  testId,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex items-center rounded-[9px]"
      style={{
        background: c.inputBg,
        border: `1px solid ${focused ? c.green : c.inputBorder}`,
        boxShadow: focused ? `0 0 0 3px ${c.green}1f` : "none",
        padding: "0 12px",
        height: 42,
      }}
    >
      {dot && (
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: dot, marginRight: 8 }}
        />
      )}
      {prefix && (
        <span style={{ color: c.muted, fontSize: 14, marginRight: 4 }}>
          {prefix}
        </span>
      )}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        data-test-id={testId}
        className="bg-transparent outline-none w-full"
        style={{ fontFamily: MONO, fontSize: 15, color: c.text, fontWeight: 500 }}
      />
      {suffix && (
        <span style={{ color: c.muted, fontSize: 14, marginLeft: 4 }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

const FieldLabel = ({ c, children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: c.muted,
      marginBottom: 7,
    }}
  >
    {children}
  </div>
);

const StatTile = ({ c, label, value, sub, valueColor, accent, testId }) => (
  <div
    style={{
      background: c.card,
      border: `1px solid ${accent ? c.tileAccent : c.border}`,
      borderRadius: 12,
      padding: "15px 16px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {accent && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg,${c.tileGlow},transparent 60%)`,
        }}
      />
    )}
    <div style={{ position: "relative" }}>
      <FieldLabel c={c}>{label}</FieldLabel>
      <div
        data-test-id={testId}
        style={{
          fontFamily: MONO,
          fontSize: 26,
          fontWeight: 600,
          color: valueColor || c.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: valueColor === c.blue ? c.blue : c.muted,
            marginTop: 5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  </div>
);

const Divider = ({ c, children }) => (
  <div className="flex items-center gap-2.5" style={{ margin: "16px 0" }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: c.divider,
      }}
    >
      {children}
    </div>
    <div style={{ flex: 1, height: 1, background: c.borderSoft }} />
  </div>
);

// ---- Payoff diagram geometry ----
const buildPayoff = (r, c) => {
  const TOP = 30;
  const BOT = 176;
  const L = 60;
  const R = 590;
  const loss = Math.abs(r.maxLoss);
  const scaleGain = r.maxGain > 0 ? r.maxGain : loss || 1;
  const zeroFrac = scaleGain / (scaleGain + (loss || 1));
  const zeroY = TOP + zeroFrac * (BOT - TOP);
  const yFor = (pl) =>
    pl >= 0
      ? zeroY - (pl / scaleGain) * (zeroY - TOP)
      : zeroY + (pl / r.maxLoss) * (BOT - zeroY);

  const pts = [
    { price: r.stopPrice, pl: r.maxLoss, kind: "stop", color: c.red },
    { price: r.entryPrice, pl: 0, kind: "entry", color: c.textMid },
  ];
  if (r.targetPrice != null) {
    pts.push({ price: r.targetPrice, pl: r.maxGain, kind: "target", color: c.green });
  }
  pts.sort((a, b) => a.price - b.price);
  const prices = pts.map((p) => p.price);
  let pmin = Math.min(...prices);
  let pmax = Math.max(...prices);
  if (pmin === pmax) pmax = pmin + 1;
  const xFor = (price) => L + ((price - pmin) / (pmax - pmin)) * (R - L);

  const coords = pts.map((p) => ({ ...p, x: xFor(p.price), y: yFor(p.pl) }));
  return { TOP, BOT, L, R, zeroY, coords };
};

const RiskCalculator = () => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  const c = makePalette(isDark);

  const [calculatorType, setCalculatorType] = useState("futures");
  // Prefilled: account balance, risk %, and entry price. Stop / target left blank.
  const [formData, setFormData] = useState({
    accountBalance: "50000",
    riskPercentage: "2",
    entryPrice: "4200",
    stopLoss: "",
    takeProfit: "",
    tickSize: "0.25",
    tickValue: "12.50",
    stockPrice: "150",
    stockStopLoss: "",
    stockTakeProfit: "",
    forexEntry: "1.0850",
    forexStopLoss: "",
    forexTakeProfit: "",
    lotSize: "100000",
    pipValue: "10",
  });

  const [results, setResults] = useState(null);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  // Close the over-risk dialog on Escape (listener cleaned up on unmount/close)
  useEffect(() => {
    if (!showRiskWarning) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setShowRiskWarning(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showRiskWarning]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const unitForType = (type) =>
    type === "stocks" ? "shares" : type === "forex" ? "lots" : "contracts";

  const selectType = (type) => {
    setCalculatorType(type);
    setResults(null);
    setShowRiskWarning(false);
  };

  const validPrice = (n) => Number.isFinite(n) && n > 0;

  const calculateFuturesRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const entryPrice = parseFloat(formData.entryPrice);
    const stopLoss = parseFloat(formData.stopLoss);
    const takeProfit = parseFloat(formData.takeProfit);
    const tickSize = parseFloat(formData.tickSize);
    const tickValue = parseFloat(formData.tickValue);

    if (
      !validPrice(accountBalance) ||
      !validPrice(entryPrice) ||
      !validPrice(stopLoss) ||
      entryPrice === stopLoss ||
      !validPrice(tickSize) ||
      !Number.isFinite(tickValue)
    ) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const ticksRisk = priceRisk / tickSize;
    const riskPerUnit = ticksRisk * tickValue;
    const positionSize = Math.floor(riskAmount / riskPerUnit);
    const maxLoss = -(riskPerUnit * positionSize);

    let maxGain = 0;
    let rewardPerUnit = 0;
    let riskRewardRatio = 0;
    let targetPrice = null;
    if (validPrice(takeProfit)) {
      const priceReward = Math.abs(takeProfit - entryPrice);
      rewardPerUnit = (priceReward / tickSize) * tickValue;
      maxGain = rewardPerUnit * positionSize;
      riskRewardRatio = rewardPerUnit / riskPerUnit;
      targetPrice = takeProfit;
    }

    return {
      direction: stopLoss < entryPrice ? "long" : "short",
      positionSize,
      positionUnit: "contracts",
      entryPrice,
      stopPrice: stopLoss,
      targetPrice,
      maxLoss,
      maxGain,
      maxLossPct: (Math.abs(maxLoss) / accountBalance) * 100,
      maxGainPct: (maxGain / accountBalance) * 100,
      riskRewardRatio,
      riskPerUnit,
      rewardPerUnit,
      breakeven: entryPrice,
      accountAtRisk: (Math.abs(maxLoss) / accountBalance) * 100,
      // Over-risk: a single contract already exceeds the chosen risk budget.
      overRisk: positionSize === 0,
      minUnitRisk: riskPerUnit,
      minUnitRiskPct: (riskPerUnit / accountBalance) * 100,
      riskBudget: riskAmount,
      riskPct: riskPercentage,
    };
  };

  const calculateStockRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const entryPrice = parseFloat(formData.stockPrice);
    const stopLoss = parseFloat(formData.stockStopLoss);
    const takeProfit = parseFloat(formData.stockTakeProfit);

    if (
      !validPrice(accountBalance) ||
      !validPrice(entryPrice) ||
      !validPrice(stopLoss) ||
      entryPrice === stopLoss
    ) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    const positionSize = Math.floor(riskAmount / riskPerUnit);
    const maxLoss = -(riskPerUnit * positionSize);

    let maxGain = 0;
    let rewardPerUnit = 0;
    let riskRewardRatio = 0;
    let targetPrice = null;
    if (validPrice(takeProfit)) {
      rewardPerUnit = Math.abs(takeProfit - entryPrice);
      maxGain = rewardPerUnit * positionSize;
      riskRewardRatio = rewardPerUnit / riskPerUnit;
      targetPrice = takeProfit;
    }

    return {
      direction: stopLoss < entryPrice ? "long" : "short",
      positionSize,
      positionUnit: "shares",
      entryPrice,
      stopPrice: stopLoss,
      targetPrice,
      maxLoss,
      maxGain,
      maxLossPct: (Math.abs(maxLoss) / accountBalance) * 100,
      maxGainPct: (maxGain / accountBalance) * 100,
      riskRewardRatio,
      riskPerUnit,
      rewardPerUnit,
      breakeven: entryPrice,
      accountAtRisk: (Math.abs(maxLoss) / accountBalance) * 100,
      // Over-risk: a single share already exceeds the chosen risk budget.
      overRisk: positionSize === 0,
      minUnitRisk: riskPerUnit,
      minUnitRiskPct: (riskPerUnit / accountBalance) * 100,
      riskBudget: riskAmount,
      riskPct: riskPercentage,
    };
  };

  const calculateForexRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const entryPrice = parseFloat(formData.forexEntry);
    const stopLoss = parseFloat(formData.forexStopLoss);
    const takeProfit = parseFloat(formData.forexTakeProfit);
    const pipValue = parseFloat(formData.pipValue);

    if (
      !validPrice(accountBalance) ||
      !validPrice(entryPrice) ||
      !validPrice(stopLoss) ||
      entryPrice === stopLoss ||
      !Number.isFinite(pipValue)
    ) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const pipsRisk = Math.abs(entryPrice - stopLoss) * 10000;
    const riskPerUnit = pipsRisk * pipValue;
    const positionSize = riskAmount / riskPerUnit;
    const maxLoss = -(riskPerUnit * positionSize);

    let maxGain = 0;
    let rewardPerUnit = 0;
    let riskRewardRatio = 0;
    let targetPrice = null;
    if (validPrice(takeProfit)) {
      const pipsReward = Math.abs(takeProfit - entryPrice) * 10000;
      rewardPerUnit = pipsReward * pipValue;
      maxGain = rewardPerUnit * positionSize;
      riskRewardRatio = rewardPerUnit / riskPerUnit;
      targetPrice = takeProfit;
    }

    return {
      direction: stopLoss < entryPrice ? "long" : "short",
      positionSize,
      positionUnit: "lots",
      entryPrice,
      stopPrice: stopLoss,
      targetPrice,
      maxLoss,
      maxGain,
      maxLossPct: (Math.abs(maxLoss) / accountBalance) * 100,
      maxGainPct: (maxGain / accountBalance) * 100,
      riskRewardRatio,
      riskPerUnit,
      rewardPerUnit,
      breakeven: entryPrice,
      accountAtRisk: (Math.abs(maxLoss) / accountBalance) * 100,
      // Forex sizes in fractional lots, so it always fits the risk budget.
      overRisk: false,
      minUnitRisk: riskPerUnit,
      minUnitRiskPct: (riskPerUnit / accountBalance) * 100,
      riskBudget: riskAmount,
      riskPct: riskPercentage,
    };
  };

  const handleCalculate = () => {
    let res = null;
    if (calculatorType === "futures") res = calculateFuturesRisk();
    else if (calculatorType === "stocks") res = calculateStockRisk();
    else if (calculatorType === "forex") res = calculateForexRisk();
    setResults(res);
    setShowRiskWarning(Boolean(res && res.overRisk));
  };

  const resetCalculator = () => {
    setFormData({
      accountBalance: "50000",
      riskPercentage: "2",
      entryPrice: "4200",
      stopLoss: "",
      takeProfit: "",
      tickSize: "0.25",
      tickValue: "12.50",
      stockPrice: "150",
      stockStopLoss: "",
      stockTakeProfit: "",
      forexEntry: "1.0850",
      forexStopLoss: "",
      forexTakeProfit: "",
      lotSize: "100000",
      pipValue: "10",
    });
    setResults(null);
    setShowRiskWarning(false);
  };

  // Cards always render — default to a zero placeholder until calculated.
  const zeroResults = {
    direction: "long",
    positionSize: 0,
    positionUnit: unitForType(calculatorType),
    entryPrice: 0,
    stopPrice: 0,
    targetPrice: null,
    maxLoss: 0,
    maxGain: 0,
    maxLossPct: 0,
    maxGainPct: 0,
    riskRewardRatio: 0,
    riskPerUnit: 0,
    rewardPerUnit: 0,
    breakeven: 0,
    accountAtRisk: 0,
    isPlaceholder: true,
  };
  const view = results || zeroResults;

  const rrQuality =
    view.riskRewardRatio >= 2
      ? { label: "favorable", color: c.blue }
      : view.riskRewardRatio >= 1.5
      ? { label: "acceptable", color: c.green }
      : { label: "unfavorable", color: c.red };

  const positionDisplay = (r) =>
    r.positionUnit === "lots"
      ? r.positionSize.toFixed(2)
      : r.positionSize.toLocaleString();

  const segments = [
    { value: "futures", label: "Futures" },
    { value: "stocks", label: "Stocks" },
    { value: "forex", label: "Forex" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Risk / Reward Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Position sizing &amp; trade R:R — see your max loss, max gain, and
          payoff before you take the trade.
        </p>
      </div>

      {/* ===== Panel ===== */}
      <div
        data-test-id="risk-calculator-panel"
        style={{
          background: c.panel,
          borderRadius: 18,
          border: `1px solid ${c.border}`,
          overflow: "hidden",
          boxShadow: c.shadow,
        }}
      >
        {/* top bar */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "18px 26px",
            borderBottom: `1px solid ${c.borderSoft}`,
            background: c.topbar,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(145deg,#2ebd85,#1f8f64)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 16 L10 10 L14 14 L20 7"
                  stroke="#06140d"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: c.text,
                  letterSpacing: "-0.01em",
                }}
              >
                Risk / Reward Calculator
              </div>
              <div style={{ fontSize: 12, color: c.muted }}>
                Position sizing &amp; trade R:R
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 12, color: c.muted }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  background: results ? c.green : c.muted,
                  boxShadow: results ? `0 0 0 3px ${c.green}2e` : "none",
                }}
              />
              {results ? "Calculated" : "Idle"}
            </div>
            <button
              onClick={resetCalculator}
              data-test-id="risk-calculator-reset-btn"
              style={{
                background: "transparent",
                border: `1px solid ${c.inputBorder}`,
                color: c.textMid,
                fontSize: 13,
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "minmax(0,392px) 1fr" }}
        >
          {/* ===== LEFT: inputs ===== */}
          <div
            style={{
              padding: 26,
              borderRight: `1px solid ${c.borderSoft}`,
              background: c.left,
            }}
          >
            <FieldLabel c={c}>Instrument</FieldLabel>
            <div
              className="flex gap-1"
              style={{
                background: c.segBg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {segments.map((s) => {
                const active = calculatorType === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => selectType(s.value)}
                    data-test-id={`risk-calculator-type-${s.value}`}
                    className="flex-1 text-center"
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? c.segActiveText : c.textMid,
                      background: active ? c.green : "transparent",
                      padding: "8px 0",
                      borderRadius: 7,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}
            >
              <div>
                <FieldLabel c={c}>Account Balance</FieldLabel>
                <TerminalInput
                  c={c}
                  value={formData.accountBalance}
                  onChange={(v) => handleInputChange("accountBalance", v)}
                  prefix="$"
                  placeholder="50,000"
                  testId="risk-calculator-account-balance-input"
                />
              </div>
              <div>
                <FieldLabel c={c}>Risk %</FieldLabel>
                <TerminalInput
                  c={c}
                  value={formData.riskPercentage}
                  onChange={(v) => handleInputChange("riskPercentage", v)}
                  suffix="%"
                  step="0.1"
                  placeholder="2.0"
                  testId="risk-calculator-risk-pct-input"
                />
              </div>
            </div>

            {calculatorType === "futures" && (
              <>
                <Divider c={c}>Futures Contract</Divider>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}
                >
                  <div>
                    <FieldLabel c={c}>Entry Price</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.entryPrice}
                      onChange={(v) => handleInputChange("entryPrice", v)}
                      step="0.01"
                      placeholder="4,200.00"
                      testId="risk-calculator-entry-input"
                    />
                  </div>
                  <div>
                    <FieldLabel c={c}>Stop Loss</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.stopLoss}
                      onChange={(v) => handleInputChange("stopLoss", v)}
                      step="0.01"
                      dot={c.red}
                      placeholder="4,195.00"
                      testId="risk-calculator-stop-input"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <FieldLabel c={c}>Take Profit</FieldLabel>
                  <TerminalInput
                    c={c}
                    value={formData.takeProfit}
                    onChange={(v) => handleInputChange("takeProfit", v)}
                    step="0.01"
                    dot={c.green}
                    placeholder="4,215.00"
                    testId="risk-calculator-target-input"
                  />
                </div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}
                >
                  <div>
                    <FieldLabel c={c}>Tick Size</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.tickSize}
                      onChange={(v) => handleInputChange("tickSize", v)}
                      step="0.01"
                      placeholder="0.25"
                      testId="risk-calculator-tick-size-input"
                    />
                  </div>
                  <div>
                    <FieldLabel c={c}>Tick Value</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.tickValue}
                      onChange={(v) => handleInputChange("tickValue", v)}
                      prefix="$"
                      step="0.01"
                      placeholder="12.50"
                      testId="risk-calculator-tick-value-input"
                    />
                  </div>
                </div>
              </>
            )}

            {calculatorType === "stocks" && (
              <>
                <Divider c={c}>Stock Details</Divider>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}
                >
                  <div>
                    <FieldLabel c={c}>Stock Price</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.stockPrice}
                      onChange={(v) => handleInputChange("stockPrice", v)}
                      prefix="$"
                      step="0.01"
                      placeholder="150.00"
                      testId="risk-calculator-stock-price-input"
                    />
                  </div>
                  <div>
                    <FieldLabel c={c}>Stop Loss</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.stockStopLoss}
                      onChange={(v) => handleInputChange("stockStopLoss", v)}
                      prefix="$"
                      step="0.01"
                      dot={c.red}
                      placeholder="145.00"
                      testId="risk-calculator-stock-stop-input"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel c={c}>Take Profit</FieldLabel>
                  <TerminalInput
                    c={c}
                    value={formData.stockTakeProfit}
                    onChange={(v) => handleInputChange("stockTakeProfit", v)}
                    prefix="$"
                    step="0.01"
                    dot={c.green}
                    placeholder="160.00"
                    testId="risk-calculator-stock-target-input"
                  />
                </div>
              </>
            )}

            {calculatorType === "forex" && (
              <>
                <Divider c={c}>Forex Pair</Divider>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}
                >
                  <div>
                    <FieldLabel c={c}>Entry Price</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.forexEntry}
                      onChange={(v) => handleInputChange("forexEntry", v)}
                      step="0.0001"
                      placeholder="1.0850"
                      testId="risk-calculator-forex-entry-input"
                    />
                  </div>
                  <div>
                    <FieldLabel c={c}>Stop Loss</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.forexStopLoss}
                      onChange={(v) => handleInputChange("forexStopLoss", v)}
                      step="0.0001"
                      dot={c.red}
                      placeholder="1.0800"
                      testId="risk-calculator-forex-stop-input"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <FieldLabel c={c}>Take Profit</FieldLabel>
                  <TerminalInput
                    c={c}
                    value={formData.forexTakeProfit}
                    onChange={(v) => handleInputChange("forexTakeProfit", v)}
                    step="0.0001"
                    dot={c.green}
                    placeholder="1.0950"
                    testId="risk-calculator-forex-target-input"
                  />
                </div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}
                >
                  <div>
                    <FieldLabel c={c}>Lot Size</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.lotSize}
                      onChange={(v) => handleInputChange("lotSize", v)}
                      placeholder="100,000"
                      testId="risk-calculator-lot-size-input"
                    />
                  </div>
                  <div>
                    <FieldLabel c={c}>Pip Value</FieldLabel>
                    <TerminalInput
                      c={c}
                      value={formData.pipValue}
                      onChange={(v) => handleInputChange("pipValue", v)}
                      prefix="$"
                      step="0.01"
                      placeholder="10"
                      testId="risk-calculator-pip-value-input"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleCalculate}
              data-test-id="risk-calculator-calculate-btn"
              className="w-full"
              style={{
                marginTop: 22,
                background: "linear-gradient(145deg,#2ebd85,#1f8f64)",
                color: c.btnText,
                fontWeight: 600,
                fontSize: 14,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
              }}
            >
              Calculate Risk &amp; Reward
            </button>

            <div
              className="flex items-center gap-2"
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 10,
                background: c.infoBg,
                border: `1px solid ${c.infoBorder}`,
                fontSize: 12,
                color: c.infoText,
              }}
            >
              <Info size={14} style={{ flexShrink: 0 }} />
              {results
                ? `Risk budget ${fmtMoney(
                    (parseFloat(formData.accountBalance) *
                      parseFloat(formData.riskPercentage)) /
                      100
                  )} · ${formData.riskPercentage}% of account`
                : "Enter a stop loss, then Calculate to size the trade."}
            </div>
          </div>

          {/* ===== RIGHT: results (always shown) ===== */}
          <div style={{ padding: "26px 28px", minWidth: 0 }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 18 }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: c.textMid,
                  letterSpacing: "0.02em",
                }}
              >
                TRADE SETUP
              </div>
              <div
                className="flex items-center gap-1.5"
                data-test-id="risk-calculator-direction-badge"
                style={{
                  padding: "5px 11px",
                  borderRadius: 999,
                  background:
                    view.direction === "long"
                      ? "rgba(46,189,133,0.12)"
                      : "rgba(246,70,93,0.12)",
                  border: `1px solid ${
                    view.direction === "long"
                      ? "rgba(46,189,133,0.25)"
                      : "rgba(246,70,93,0.25)"
                  }`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: view.direction === "long" ? c.green : c.red,
                  opacity: view.isPlaceholder ? 0.55 : 1,
                }}
              >
                {view.direction === "long" ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {view.direction === "long" ? "LONG" : "SHORT"}
              </div>
            </div>

            {/* stat tiles */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <StatTile
                c={c}
                label="Position Size"
                value={positionDisplay(view)}
                sub={view.positionUnit}
                testId="risk-calculator-position-size-value"
              />
              <StatTile
                c={c}
                label="Risk : Reward"
                value={
                  view.maxGain > 0
                    ? `1:${view.riskRewardRatio.toFixed(1)}`
                    : view.isPlaceholder
                    ? "1:0.0"
                    : "—"
                }
                sub={view.maxGain > 0 ? rrQuality.label : "needs target"}
                valueColor={view.maxGain > 0 ? rrQuality.color : c.muted}
                accent={view.maxGain > 0}
                testId="risk-calculator-rr-value"
              />
              <StatTile
                c={c}
                label="Max Loss"
                value={fmtMoney(view.maxLoss)}
                sub={`${view.maxLossPct.toFixed(1)}% of acct`}
                valueColor={view.maxLoss < 0 ? c.red : c.muted}
                testId="risk-calculator-max-loss-value"
              />
              <StatTile
                c={c}
                label="Max Gain"
                value={
                  view.maxGain > 0
                    ? `+${fmtMoney(view.maxGain)}`
                    : view.isPlaceholder
                    ? "$0"
                    : "—"
                }
                sub={view.maxGain > 0 ? `${view.maxGainPct.toFixed(1)}% of acct` : "needs target"}
                valueColor={view.maxGain > 0 ? c.green : c.muted}
                testId="risk-calculator-max-gain-value"
              />
            </div>

            {/* payoff diagram */}
            <PayoffDiagram c={c} results={view} />

            {/* bottom: gauge + per-unit */}
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                style={{
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: "15px 16px",
                }}
              >
                <div
                  className="flex items-baseline justify-between"
                  style={{ marginBottom: 10 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: c.muted,
                    }}
                  >
                    Account at Risk
                  </span>
                  <span
                    data-test-id="risk-calculator-account-risk-value"
                    style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: c.text }}
                  >
                    {view.accountAtRisk.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 4,
                    background: c.track,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "40%",
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: c.gaugeMark,
                    }}
                  />
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(view.accountAtRisk / 5, 1) * 100}%`,
                      borderRadius: 4,
                      background:
                        view.accountAtRisk <= 2
                          ? "linear-gradient(90deg,#2ebd85,#27a774)"
                          : view.accountAtRisk <= 5
                          ? "linear-gradient(90deg,#f0a93b,#e08c1f)"
                          : "linear-gradient(90deg,#f6465d,#d32f44)",
                    }}
                  />
                </div>
                <div
                  className="flex justify-between"
                  style={{ fontSize: 10, color: c.axisLabel, marginTop: 6, fontFamily: MONO }}
                >
                  <span>0%</span>
                  <span>5% cap</span>
                </div>
              </div>

              <div
                className="flex flex-col justify-center"
                style={{
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: "15px 16px",
                  gap: 7,
                }}
              >
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: c.textMid }}>
                    Risk / {view.positionUnit.replace(/s$/, "")}
                  </span>
                  <span style={{ fontFamily: MONO, color: view.riskPerUnit > 0 ? c.red : c.muted, fontWeight: 500 }}>
                    {fmtMoney(view.riskPerUnit)}
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: c.textMid }}>
                    Reward / {view.positionUnit.replace(/s$/, "")}
                  </span>
                  <span style={{ fontFamily: MONO, color: view.maxGain > 0 ? c.green : c.muted, fontWeight: 500 }}>
                    {view.maxGain > 0 ? fmtMoney(view.rewardPerUnit) : "—"}
                  </span>
                </div>
                <div style={{ height: 1, background: c.borderSoft, margin: "1px 0" }} />
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: c.textStrong, fontWeight: 600 }}>Breakeven</span>
                  <span style={{ fontFamily: MONO, color: view.breakeven > 0 ? c.text : c.muted, fontWeight: 600 }}>
                    {view.breakeven > 0 ? fmtPrice(view.breakeven) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Over-risk warning dialog */}
      {showRiskWarning && results && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(8,11,16,0.62)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowRiskWarning(false)}
          data-test-id="risk-calculator-risk-warning-overlay"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="risk-warning-title"
            data-test-id="risk-calculator-risk-warning-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: c.panel,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              boxShadow: c.shadow,
              width: "100%",
              maxWidth: 460,
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-start gap-3"
              style={{ padding: "22px 24px 16px" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(246,70,93,0.12)",
                  border: "1px solid rgba(246,70,93,0.28)",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={19} style={{ color: c.red }} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  id="risk-warning-title"
                  style={{ fontSize: 16, fontWeight: 600, color: c.text }}
                >
                  Trade exceeds your risk limit
                </div>
                <div
                  style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}
                >
                  Position can&apos;t be sized within {results.riskPct}% risk
                </div>
              </div>
              <button
                onClick={() => setShowRiskWarning(false)}
                data-test-id="risk-calculator-risk-warning-close-btn"
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: c.muted,
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "0 24px 8px" }}>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: c.textMid,
                  margin: 0,
                }}
              >
                A single {results.positionUnit.replace(/s$/, "")} risks{" "}
                <strong style={{ color: c.red, fontFamily: MONO }}>
                  {fmtMoney(results.minUnitRisk)}
                </strong>{" "}
                (
                <strong style={{ color: c.text, fontFamily: MONO }}>
                  {results.minUnitRiskPct.toFixed(1)}%
                </strong>{" "}
                of your account) — more than your chosen{" "}
                <strong style={{ color: c.text }}>{results.riskPct}%</strong>{" "}
                limit of{" "}
                <strong style={{ color: c.text, fontFamily: MONO }}>
                  {fmtMoney(results.riskBudget)}
                </strong>
                . Taking even one would over-risk the account, so the position
                size is <strong style={{ color: c.text }}>0</strong>.
              </p>

              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: c.infoBg,
                  border: `1px solid ${c.infoBorder}`,
                  fontSize: 12.5,
                  color: c.infoText,
                  lineHeight: 1.55,
                }}
              >
                To take this trade, you can:
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>Tighten your stop loss (smaller distance to entry)</li>
                  <li>Increase your risk % (above)</li>
                  <li>Use a smaller-value instrument or contract</li>
                </ul>
              </div>
            </div>

            <div
              className="flex justify-end gap-3"
              style={{ padding: "16px 24px 20px" }}
            >
              <button
                onClick={() => setShowRiskWarning(false)}
                data-test-id="risk-calculator-risk-warning-dismiss-btn"
                style={{
                  background: "linear-gradient(145deg,#2ebd85,#1f8f64)",
                  color: c.btnText,
                  fontWeight: 600,
                  fontSize: 13.5,
                  padding: "9px 20px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

// ---- Trade Payoff (dynamic SVG) — tightly coupled sub-component ----
const PayoffDiagram = ({ c, results }) => {
  const isPlaceholder = results.isPlaceholder || results.maxLoss === 0;

  return (
    <div
      data-test-id="risk-calculator-payoff-chart"
      style={{
        background: c.left,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: "20px 22px 16px",
        marginBottom: 18,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <div className="flex items-center gap-1.5">
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textStrong }}>
            Trade Payoff
          </div>
          <span
            data-test-id="risk-calculator-payoff-info"
            title="Projected profit or loss across possible exit prices for your full position. Left of entry is loss (red), right is gain (green). The line crosses $0 at your entry price."
            style={{ display: "inline-flex", cursor: "help", color: c.muted }}
          >
            <Info size={13} />
          </span>
        </div>
        <div style={{ fontSize: 11, color: c.muted, fontFamily: MONO }}>
          {isPlaceholder
            ? "P/L by exit price"
            : `P/L by exit price · ${
                results.positionUnit === "lots"
                  ? results.positionSize.toFixed(2)
                  : results.positionSize.toLocaleString()
              } ${results.positionUnit}`}
        </div>
      </div>

      {isPlaceholder ? (
        // Illustrative placeholder — shows the shape of a payoff, no fake prices
        <svg viewBox="0 0 620 210" width="100%" style={{ display: "block" }}>
          <line
            x1="60"
            y1="150"
            x2="590"
            y2="150"
            stroke={c.gaugeMark}
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <text x="54" y="154" textAnchor="end" fontSize="9" fill={c.axisLabel} fontFamily={MONO}>
            $0
          </text>
          <text x="325" y="120" textAnchor="middle" fontSize="10" fill={c.muted}>
            Enter a stop loss (and target) to plot your trade payoff
          </text>
        </svg>
      ) : (
        <PayoffPlot c={c} results={results} />
      )}
    </div>
  );
};

const PayoffPlot = ({ c, results }) => {
  const g = buildPayoff(results, c);
  const entry = g.coords.find((d) => d.kind === "entry");
  const left = g.coords[0];
  const right = g.coords[g.coords.length - 1];

  const regionPoly = (a, b) =>
    `${a.x},${g.zeroY} ${a.x},${a.y} ${b.x},${b.y} ${b.x},${g.zeroY}`;

  return (
    <svg viewBox="0 0 620 210" width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="rcGrn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.green} stopOpacity="0.34" />
          <stop offset="100%" stopColor={c.green} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="rcRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.red} stopOpacity="0.04" />
          <stop offset="100%" stopColor={c.red} stopOpacity="0.34" />
        </linearGradient>
      </defs>

      {/* zero line */}
      <line
        x1={g.L}
        y1={g.zeroY}
        x2={g.R}
        y2={g.zeroY}
        stroke={c.gaugeMark}
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <text x={g.L - 6} y={g.zeroY + 4} textAnchor="end" fontSize="10" fill={c.axisLabel} fontFamily={MONO}>
        $0
      </text>

      {/* region fills */}
      {entry && entry !== left && (
        <polygon points={regionPoly(left, entry)} fill={left.pl < 0 ? "url(#rcRed)" : "url(#rcGrn)"} />
      )}
      {entry && entry !== right && (
        <polygon points={regionPoly(entry, right)} fill={right.pl < 0 ? "url(#rcRed)" : "url(#rcGrn)"} />
      )}

      {/* payoff line */}
      <polyline
        points={g.coords.map((d) => `${d.x},${d.y}`).join(" ")}
        fill="none"
        stroke={c.blue}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* markers — price labels below the axis, P/L labels above the dot (no overlap) */}
      {g.coords.map((d) => (
        <g key={d.kind} fontFamily={MONO}>
          <line
            x1={d.x}
            y1={g.TOP}
            x2={d.x}
            y2={g.BOT + 4}
            stroke={d.color}
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.45"
          />
          <circle cx={d.x} cy={d.y} r="4.5" fill={c.left} stroke={d.color} strokeWidth="2" />
          {d.kind !== "entry" && (
            <text x={d.x} y={d.y - 10} textAnchor="middle" fontSize="11" fill={d.color} fontWeight="600">
              {d.pl >= 0 ? "+" : ""}
              {fmtMoney(d.pl)}
            </text>
          )}
          <text
            x={d.x}
            y={g.BOT + 19}
            textAnchor={d === left ? "start" : d === right ? "end" : "middle"}
            fontSize="11"
            fill={d.color}
            fontWeight="600"
          >
            {fmtPrice(d.price)}
          </text>
          <text
            x={d.x}
            y={g.BOT + 31}
            textAnchor={d === left ? "start" : d === right ? "end" : "middle"}
            fontSize="9"
            fill={c.muted}
          >
            {d.kind}
          </text>
        </g>
      ))}
    </svg>
  );
};

export default RiskCalculator;
