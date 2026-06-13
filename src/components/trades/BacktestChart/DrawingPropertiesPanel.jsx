import React, { useState, useEffect, useRef } from "react";
import { GripHorizontal, GripVertical } from "lucide-react";
import { DEFAULT_FIB_LEVELS } from "./chartConfig";
import {
  listPresets,
  savePreset,
  deletePreset,
  setActivePreset,
  getActivePresetName,
  getSavedFields,
  reorderPresets,
  MAX_PRESET_NAME_LENGTH,
} from "./drawingDefaults";

const COLORS = ["#1E53E5", "#089981", "#f23645", "#f7a600", "#9333ea", "#ef4444", "#787b86", "#ffffff"];

const TOOL_LABELS = {
  segment: "Line Segment",
  trendline: "Trend Line",
  extline: "Extended Line",
  ray: "Ray",
  hline: "Horizontal Line",
  vline: "Vertical Line",
  text: "Text Label",
  rectangle: "Rectangle",
  fibonacci: "Fibonacci",
  rr: "Risk / Reward",
};

// One settings row — label on the left, control on the right.
// Module-level component so inputs inside don't remount on every parent render.
const Row = ({ label, theme, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: "4px 8px",
      borderBottom: `1px solid ${theme.divider}`,
    }}
  >
    <span style={{ fontSize: 9, fontWeight: 600, color: theme.labelC, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      {label}
    </span>
    {children}
  </div>
);

const selectStyle = (theme) => ({
  padding: "3px 6px",
  borderRadius: 4,
  border: `1px solid ${theme.divider}`,
  background: theme.inputBg,
  color: theme.textC,
  fontSize: 11,
  outline: "none",
  cursor: "pointer",
  minWidth: 86,
});

const inputStyle = (theme) => ({
  padding: "3px 6px",
  borderRadius: 4,
  border: `1px solid ${theme.divider}`,
  background: theme.inputBg,
  color: theme.textC,
  fontSize: 11,
  outline: "none",
});

// Compact swatch strip for the Color row. `allowAuto` adds a multi-color
// "Auto" swatch that resets color to null (fibonacci per-level colors).
const ColorSwatches = ({ value, onPick, isDark, allowAuto = false }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "flex-end", maxWidth: 116 }}>
    {allowAuto && (
      <button
        title="Auto (multi-color)"
        onClick={() => onPick(null)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          cursor: "pointer",
          padding: 0,
          background: "linear-gradient(90deg,#787b86 0%,#089981 40%,#f7a600 70%,#787b86 100%)",
          border: !value ? "2px solid #60a5fa" : `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)"}`,
          outline: "none",
        }}
      />
    )}
    {COLORS.map((c) => (
      <button
        key={c}
        title={c}
        onClick={() => onPick(c)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          background: c,
          cursor: "pointer",
          padding: 0,
          border: value === c ? "2px solid #60a5fa" : `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)"}`,
          outline: "none",
        }}
      />
    ))}
  </div>
);

// Named settings presets for the selected tool.
const PresetsSection = ({ sel, theme, onPropertyChange }) => {
  const [, setVersion] = useState(0);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const feedbackTimerRef = useRef(null);
  const dragItemRef = useRef(null);
  useEffect(() => () => clearTimeout(feedbackTimerRef.current), []);

  const presets = listPresets(sel.type);
  const active = getActivePresetName(sel.type);
  const bump = () => setVersion((v) => v + 1);

  // Save is enabled only when the user has typed a name that doesn't yet exist
  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !presets.some((p) => p.name === trimmedName);

  const btn = {
    padding: "3px 8px",
    borderRadius: 4,
    cursor: "pointer",
    border: `1px solid ${theme.divider}`,
    background: "transparent",
    color: theme.textC,
    fontSize: 10,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  // Always save current settings to the active preset — no dirty tracking needed
  const handleUpdate = () => {
    if (!active) return;
    savePreset(sel.type, active, sel);
    bump();
    clearTimeout(feedbackTimerRef.current);
    setFeedback(true);
    feedbackTimerRef.current = setTimeout(() => setFeedback(false), 1500);
  };

  const applyPreset = (n) => {
    setActivePreset(sel.type, n);
    const p = listPresets(sel.type).find((x) => x.name === n);
    if (p) onPropertyChange?.(sel.id, { ...p.style });
    bump();
    setDropdownOpen(false);
  };

  const sectionWrap = { padding: "6px 10px 8px", background: theme.bgSect, display: "flex", flexDirection: "column", gap: 5 };
  const sectionLabel = { fontSize: 9, fontWeight: 600, color: theme.labelC, textTransform: "uppercase", letterSpacing: "0.06em" };

  // Name input + Save — Save only enabled for new unique names
  const nameRow = (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <input
        type="text"
        data-testid="drawing-panel-preset-name-input"
        placeholder="Name these settings…"
        value={name}
        maxLength={MAX_PRESET_NAME_LENGTH}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSave) {
            savePreset(sel.type, trimmedName, sel);
            setName("");
            bump();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...inputStyle(theme), flex: 1, minWidth: 0 }}
      />
      <button
        data-testid="drawing-panel-preset-save-btn"
        title={canSave ? "Save current settings under this name" : trimmedName ? `"${trimmedName}" already exists — use Update instead` : "Enter a unique name to save"}
        disabled={!canSave}
        style={{
          ...btn,
          color: canSave ? theme.activeC : theme.labelC,
          borderColor: canSave ? theme.activeC : theme.divider,
          cursor: canSave ? "pointer" : "default",
          opacity: canSave ? 1 : 0.4,
        }}
        onClick={() => {
          if (!canSave) return;
          savePreset(sel.type, trimmedName, sel);
          setName("");
          bump();
        }}
      >
        Save
      </button>
    </div>
  );

  // No saved presets: show only the name input + Save
  if (presets.length === 0) {
    return (
      <div style={sectionWrap}>
        <div style={sectionLabel}>My settings</div>
        {nameRow}
      </div>
    );
  }

  // Drag-to-reorder handlers
  const handleDragStart = (e, n) => {
    dragItemRef.current = n;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDrop = (e, targetName) => {
    e.preventDefault();
    const src = dragItemRef.current;
    if (!src || src === targetName) return;
    const names = presets.map((p) => p.name);
    const from = names.indexOf(src), to = names.indexOf(targetName);
    if (from === -1 || to === -1) return;
    names.splice(from, 1);
    names.splice(to, 0, src);
    reorderPresets(sel.type, names);
    bump();
  };

  return (
    <div style={sectionWrap}>
      <div style={sectionLabel}>My settings</div>

      {/* Dropdown trigger — shows active preset name, collapses list */}
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <button
          data-testid="drawing-panel-preset-dropdown-trigger"
          onClick={() => setDropdownOpen((o) => !o)}
          style={{
            flex: 1, minWidth: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "3px 7px", borderRadius: 4,
            border: `1px solid ${theme.divider}`,
            background: theme.inputBg || theme.bg,
            color: active ? theme.textC : theme.labelC,
            fontSize: 11, cursor: "pointer", gap: 4,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {active ?? "— select settings —"}
          </span>
          <span style={{ fontSize: 8, flexShrink: 0, opacity: 0.6 }}>{dropdownOpen ? "▲" : "▼"}</span>
        </button>
        {active && (
          <>
            <button
              data-testid="drawing-panel-preset-update-btn"
              title={`Update "${active}" with current settings`}
              style={{ ...btn, padding: "3px 6px", color: theme.activeC, borderColor: theme.activeC }}
              onClick={handleUpdate}
            >
              {feedback ? "✓" : "Update"}
            </button>
            <button
              data-testid="drawing-panel-preset-delete-btn"
              title={`Delete "${active}"`}
              style={{ ...btn, padding: "3px 6px" }}
              onClick={() => { deletePreset(sel.type, active); bump(); }}
            >
              ✕
            </button>
          </>
        )}
      </div>

      {/* Collapsible draggable preset list */}
      {dropdownOpen && (
        <div
          style={{
            border: `1px solid ${theme.divider}`,
            borderRadius: 4,
            overflow: "hidden",
            maxHeight: 120,
            overflowY: "auto",
          }}
        >
          {presets.map(({ name: n }) => {
            const isActive = active === n;
            return (
              <div
                key={n}
                draggable
                onDragStart={(e) => handleDragStart(e, n)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, n)}
                data-testid={`drawing-panel-preset-item-${n}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px 4px 4px",
                  background: isActive ? (theme.activeC + "18") : "transparent",
                  borderBottom: `1px solid ${theme.divider}`,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => applyPreset(n)}
              >
                <GripVertical
                  style={{ width: 10, height: 10, flexShrink: 0, color: theme.labelC, cursor: "grab", opacity: 0.6 }}
                />
                <span style={{ fontSize: 11, flex: 1, color: isActive ? theme.activeC : theme.textC, fontWeight: isActive ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n}
                </span>
                {isActive && <span style={{ fontSize: 9, color: theme.activeC, opacity: 0.8 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {nameRow}
    </div>
  );
};

/**
 * Floating properties panel for drawing tools — vertical list, one row per
 * setting, with named persisted presets at the bottom.
 */
const DrawingPropertiesPanel = ({
  panelDrawing,
  isDark,
  onPropertyChange,
  propsPanelRef,
}) => {
  const sel = panelDrawing;
  if (!sel) return null;

  // Drag state — allows the user to reposition the panel freely
  const [drag, setDrag] = useState(null); // { startX, startY, initLeft, initTop }

  const handleHeaderDown = (e) => {
    if (!propsPanelRef?.current) return;
    const r = propsPanelRef.current.getBoundingClientRect();
    // Convert from right-anchored to left-anchored before drag starts, so
    // imperative style.left updates work correctly regardless of initial anchor.
    propsPanelRef.current.style.right = "auto";
    propsPanelRef.current.style.left = `${r.left}px`;
    propsPanelRef.current.dataset.userDragged = "1";
    setDrag({ startX: e.clientX, startY: e.clientY, initLeft: r.left, initTop: r.top });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      if (!propsPanelRef?.current) return;
      propsPanelRef.current.style.left = `${drag.initLeft + e.clientX - drag.startX}px`;
      propsPanelRef.current.style.top  = `${drag.initTop  + e.clientY - drag.startY}px`;
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]); // eslint-disable-line

  const PANEL_TYPES = ["segment", "trendline", "extline", "ray", "hline", "vline", "text", "rectangle", "fibonacci", "rr"];
  if (!PANEL_TYPES.includes(sel.type)) return null;

  const theme = {
    bgPanel: isDark ? "#1e222d" : "#ffffff",
    bgSect: isDark ? "#262b36" : "#f5f7fa",
    divider: isDark ? "#2a2e39" : "#e1ecf2",
    labelC: isDark ? "#787b86" : "#9ca3af",
    textC: isDark ? "#d1d4dc" : "#374151",
    inputBg: isDark ? "#131722" : "#ffffff",
    activeC: "#1E53E5",
  };

  const set = (changes) => onPropertyChange?.(sel.id, changes);

  // ── Per-type setting rows ──
  const rows = [];

  if (sel.type === "text") {
    rows.push(
      <Row key="text" label="Text" theme={theme}>
        <input
          type="text"
          key={`label-${sel.id}-${sel.label}`}
          defaultValue={sel.label || ""}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          onBlur={(e) => set({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...inputStyle(theme), width: 130 }}
        />
      </Row>,
      <Row key="color" label="Color" theme={theme}>
        <ColorSwatches value={sel.color || "#f7a600"} onPick={(c) => set({ color: c })} isDark={isDark} />
      </Row>,
      <Row key="size" label="Size" theme={theme}>
        <select value={sel.fontSize || 14} onChange={(e) => set({ fontSize: Number(e.target.value) })} style={selectStyle(theme)}>
          {[12, 14, 16, 18, 20, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
      </Row>,
    );
  } else if (sel.type === "rectangle") {
    rows.push(
      <Row key="text" label="Text" theme={theme}>
        <input
          type="text"
          data-testid="drawing-panel-rect-text-input"
          key={`label-${sel.id}-${sel.label}`}
          defaultValue={sel.label || ""}
          placeholder="Text inside box…"
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          onBlur={(e) => set({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...inputStyle(theme), width: 130 }}
        />
      </Row>,
      <Row key="size" label="Text size" theme={theme}>
        <select
          data-testid="drawing-panel-rect-text-size-select"
          value={sel.fontSize || 13}
          onChange={(e) => set({ fontSize: Number(e.target.value) })}
          style={selectStyle(theme)}
        >
          {[10, 12, 13, 14, 16, 18, 20, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
      </Row>,
      <Row key="textpos" label="Text pos." theme={theme}>
        <select
          data-testid="drawing-panel-rect-text-pos-select"
          value={sel.labelPos || "top-left"}
          onChange={(e) => set({ labelPos: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="top-left">Top left</option>
          <option value="top-center">Top center</option>
          <option value="center">Center</option>
          <option value="bottom-left">Bottom left</option>
        </select>
      </Row>,
      <Row key="color" label="Color" theme={theme}>
        <ColorSwatches value={sel.color || "#1E53E5"} onPick={(c) => set({ color: c })} isDark={isDark} />
      </Row>,
      <Row key="style" label="Border" theme={theme}>
        <select
          value={sel.lineStyle || "solid"}
          onChange={(e) => set({ lineStyle: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>,
      <Row key="width" label="Thickness" theme={theme}>
        <select value={sel.lineWidth || 1} onChange={(e) => set({ lineWidth: Number(e.target.value) })} style={selectStyle(theme)}>
          {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
        </select>
      </Row>,
    );
  } else if (sel.type === "fibonacci") {
    const levels = sel.levels?.length ? sel.levels : DEFAULT_FIB_LEVELS;
    const setLevel = (i, changes) => {
      set({ levels: levels.map((l, idx) => (idx === i ? { ...l, ...changes } : l)) });
    };
    rows.push(
      <Row key="color" label="Color" theme={theme}>
        <ColorSwatches value={sel.color || null} onPick={(c) => set({ color: c })} isDark={isDark} allowAuto />
      </Row>,
      <Row key="style" label="Lines" theme={theme}>
        <select
          value={sel.lineStyle || "auto"}
          onChange={(e) => set({ lineStyle: e.target.value === "auto" ? null : e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="auto">Auto</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>,
      <Row key="weight" label="Weight" theme={theme}>
        <select value={sel.lineWidth || 1} onChange={(e) => set({ lineWidth: Number(e.target.value) })} style={selectStyle(theme)}>
          {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
        </select>
      </Row>,
      <Row key="labels" label="Labels" theme={theme}>
        <select
          value={sel.showLabels === false ? "hide" : "show"}
          onChange={(e) => set({ showLabels: e.target.value === "show" })}
          style={selectStyle(theme)}
        >
          <option value="show">Show</option>
          <option value="hide">Hide</option>
        </select>
      </Row>,
      <details key="levels" style={{ borderBottom: `1px solid ${theme.divider}` }}>
        <summary
          style={{
            padding: "5px 10px",
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 600,
            color: theme.labelC,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            userSelect: "none",
          }}
        >
          Levels ({levels.filter((l) => l.visible !== false).length}/{levels.length})
        </summary>
        <div style={{ padding: "2px 10px 7px", display: "flex", flexDirection: "column", gap: 4 }}>
          {levels.map((lvl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="checkbox"
                data-testid={`fib-level-visible-${i}`}
                checked={lvl.visible !== false}
                onChange={(e) => setLevel(i, { visible: e.target.checked })}
                style={{ cursor: "pointer", margin: 0 }}
              />
              <input
                type="number"
                step="0.001"
                data-testid={`fib-level-value-${i}`}
                key={`r-${i}-${lvl.r}`}
                defaultValue={lvl.r}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setLevel(i, { r: v });
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...inputStyle(theme), width: 60, padding: "1px 4px" }}
              />
              <input
                type="color"
                data-testid={`fib-level-color-${i}`}
                value={lvl.color}
                onChange={(e) => setLevel(i, { color: e.target.value })}
                title="Level color"
                style={{ width: 22, height: 18, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
      </details>,
    );
  } else if (sel.type === "rr") {
    rows.push(
      <Row key="fill" label="Fill" theme={theme}>
        <select
          value={String(sel.fillOpacity ?? 0.18)}
          onChange={(e) => set({ fillOpacity: Number(e.target.value) })}
          style={selectStyle(theme)}
        >
          <option value="0.08">Low</option>
          <option value="0.18">Medium</option>
          <option value="0.32">High</option>
        </select>
      </Row>,
      <Row key="labels" label="Labels" theme={theme}>
        <select
          value={sel.showLabels === false ? "hide" : "show"}
          onChange={(e) => set({ showLabels: e.target.value === "show" })}
          style={selectStyle(theme)}
        >
          <option value="show">Show</option>
          <option value="hide">Hide</option>
        </select>
      </Row>,
      <Row key="entry" label="Entry line" theme={theme}>
        <select
          value={sel.lineStyle || "solid"}
          onChange={(e) => set({ lineStyle: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>,
      <Row key="rrtext" label="Text" theme={theme}>
        <input
          type="text"
          data-testid="drawing-panel-rr-text-input"
          key={`label-${sel.id}-${sel.label}`}
          defaultValue={sel.label || ""}
          placeholder="Label on box…"
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          onBlur={(e) => set({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...inputStyle(theme), width: 130 }}
        />
      </Row>,
      <Row key="rrtextpos" label="Text pos." theme={theme}>
        <select
          data-testid="drawing-panel-rr-text-pos-select"
          value={sel.labelPos || "top-left"}
          onChange={(e) => set({ labelPos: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
          <option value="center">Center</option>
          <option value="bottom-left">Bottom left</option>
        </select>
      </Row>,
    );
  } else if (sel.type === "segment") {
    rows.push(
      <Row key="text" label="Text" theme={theme}>
        <input
          type="text"
          data-testid="drawing-panel-segment-text-input"
          key={`label-${sel.id}-${sel.label}`}
          defaultValue={sel.label || ""}
          placeholder="Label on line…"
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          onBlur={(e) => set({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...inputStyle(theme), width: 130 }}
        />
      </Row>,
      <Row key="textpos" label="Text pos." theme={theme}>
        <select
          data-testid="drawing-panel-segment-text-pos-select"
          value={sel.labelPos || "middle"}
          onChange={(e) => set({ labelPos: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="middle">On middle</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
      </Row>,
      <Row key="size" label="Text size" theme={theme}>
        <select
          data-testid="drawing-panel-segment-text-size-select"
          value={sel.fontSize || 11}
          onChange={(e) => set({ fontSize: Number(e.target.value) })}
          style={selectStyle(theme)}
        >
          {[10, 11, 12, 13, 14, 16, 18, 20].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
      </Row>,
      <Row key="color" label="Color" theme={theme}>
        <ColorSwatches value={sel.color || "#f7a600"} onPick={(c) => set({ color: c })} isDark={isDark} />
      </Row>,
      <Row key="style" label="Style" theme={theme}>
        <select
          value={sel.lineStyle || "solid"}
          onChange={(e) => set({ lineStyle: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>,
      <Row key="width" label="Thickness" theme={theme}>
        <select value={sel.lineWidth || 1} onChange={(e) => set({ lineWidth: Number(e.target.value) })} style={selectStyle(theme)}>
          {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
        </select>
      </Row>,
    );
  } else {
    // Line tools — trendline / extline / ray / hline / vline
    rows.push(
      <Row key="color" label="Color" theme={theme}>
        <ColorSwatches value={sel.color || "#1E53E5"} onPick={(c) => set({ color: c })} isDark={isDark} />
      </Row>,
      <Row key="style" label="Style" theme={theme}>
        <select
          value={sel.lineStyle || "solid"}
          onChange={(e) => set({ lineStyle: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>,
      <Row key="width" label="Thickness" theme={theme}>
        <select value={sel.lineWidth || 1} onChange={(e) => set({ lineWidth: Number(e.target.value) })} style={selectStyle(theme)}>
          {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
        </select>
      </Row>,
    );
  }

  return (
    <div
      ref={propsPanelRef}
      data-testid="drawing-properties-panel"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        width: 220,
        background: theme.bgPanel,
        border: `1px solid ${theme.divider}`,
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header — drag grip + tool name */}
      <div
        onMouseDown={handleHeaderDown}
        style={{
          padding: "5px 8px",
          background: theme.bgSect,
          borderBottom: `1px solid ${theme.divider}`,
          fontSize: 10,
          fontWeight: 700,
          color: theme.textC,
          display: "flex",
          alignItems: "center",
          gap: 5,
          cursor: drag ? "grabbing" : "grab",
        }}
      >
        <GripHorizontal style={{ width: 12, height: 12, opacity: 0.4, flexShrink: 0 }} />
        {TOOL_LABELS[sel.type] || sel.type}
      </div>

      {rows}

      <PresetsSection key={sel.type} sel={sel} theme={theme} isDark={isDark} onPropertyChange={onPropertyChange} />
    </div>
  );
};

export default DrawingPropertiesPanel;
