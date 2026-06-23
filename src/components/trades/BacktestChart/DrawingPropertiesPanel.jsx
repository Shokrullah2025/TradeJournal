import React, { useState, useEffect, useRef } from "react";
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

const PANEL_TYPES = ["segment", "trendline", "extline", "ray", "hline", "vline", "text", "rectangle", "fibonacci", "rr"];

const PANEL_SHADOW = "0 12px 32px -8px rgba(31,39,51,.22), 0 2px 6px rgba(31,39,51,.08)";

// Light palette mirrors the redesign mockup; dark keeps the app's chart theme.
function buildTheme(isDark) {
  return isDark
    ? {
        panel: "#1e222d", head: "#262b36", border: "#2a2e39", borderStrong: "#363c4e",
        fieldBorder: "#363c4e", fieldBg: "#131722", ink: "#d1d4dc", label: "#787b86",
        accent: "#3b82f6", accentSoft: "rgba(59,130,246,0.18)", muted: "#1a1e27",
        chipBorder: "rgba(255,255,255,0.16)", gripDot: "#5b6472",
      }
    : {
        panel: "#ffffff", head: "#f4f5f7", border: "#e3e6eb", borderStrong: "#d3d8e0",
        fieldBorder: "#d8dde4", fieldBg: "#ffffff", ink: "#1f2733", label: "#98a1b0",
        accent: "#2563eb", accentSoft: "#eef3ff", muted: "#f7f8fa",
        chipBorder: "rgba(31,39,51,0.12)", gripDot: "#b7bfca",
      };
}

// ── Shared inline-style helpers (this file styles imperatively, like the chart) ──
const fieldInputStyle = (theme) => ({
  height: 30, border: `1px solid ${theme.fieldBorder}`, background: theme.fieldBg,
  borderRadius: 7, padding: "0 10px", font: "inherit", fontSize: 13, color: theme.ink, outline: "none",
});
const smallBtnStyle = (theme) => ({
  appearance: "none", border: `1px solid ${theme.fieldBorder}`, background: theme.fieldBg,
  borderRadius: 7, height: 30, padding: "0 12px", font: "inherit", fontSize: 13, fontWeight: 600,
  cursor: "pointer", color: theme.ink, whiteSpace: "nowrap",
});
const iconBtnStyle = (theme, active) => ({
  appearance: "none", border: `1px solid ${active ? theme.accent : theme.fieldBorder}`,
  background: active ? theme.accentSoft : theme.fieldBg, height: 26, minWidth: 26, padding: "0 5px",
  borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
  color: theme.ink, flex: "0 0 auto",
});
const popTitleStyle = (theme) => ({
  fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
  color: theme.label, marginBottom: 8,
});

const ChevronInline = ({ c }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5 6 7.5 9 4.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Six-dot drag grip — handle for repositioning the floating strip
const Grip = ({ theme, onMouseDown, dragging }) => (
  <span
    onMouseDown={onMouseDown}
    style={{
      display: "grid", gridTemplateColumns: "repeat(2, 3px)", gridTemplateRows: "repeat(3, 3px)",
      gap: 2, padding: "0 4px", cursor: dragging ? "grabbing" : "grab", flex: "0 0 auto",
    }}
  >
    {Array.from({ length: 6 }).map((_, i) => (
      <i key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: theme.gripDot, display: "block" }} />
    ))}
  </span>
);

const Divider = ({ theme }) => (
  <span style={{ width: 1, height: 20, background: theme.border, flex: "0 0 auto" }} />
);

// A select styled to match the toolbar (custom chevron, no native arrow)
const LtSelect = ({ value, onChange, theme, title, testid, minWidth = 0, children }) => (
  <div title={title} style={{ position: "relative", display: "flex", alignItems: "center", flex: "0 0 auto" }}>
    <select
      data-testid={testid}
      value={value}
      onChange={onChange}
      style={{
        appearance: "none", WebkitAppearance: "none", height: 26,
        border: `1px solid ${theme.fieldBorder}`, background: theme.fieldBg, borderRadius: 5,
        padding: "0 20px 0 7px", font: "inherit", fontSize: 12, color: theme.ink,
        cursor: "pointer", outline: "none", minWidth,
      }}
    >
      {children}
    </select>
    <span style={{ position: "absolute", right: 6, pointerEvents: "none", display: "flex" }}>
      <ChevronInline c={theme.label} />
    </span>
  </div>
);

// "T"-prefixed inline text field. Uncommitted edits commit on blur/Enter so the
// stored label only changes once, matching the panel's previous behaviour.
const LtText = ({ keyId, defaultValue, onCommit, placeholder, theme, testid }) => (
  <div
    style={{
      display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 7px",
      border: `1px solid ${theme.fieldBorder}`, borderRadius: 5, background: theme.fieldBg, flex: "0 0 auto",
    }}
  >
    <span style={{ fontSize: 11, fontWeight: 800, color: theme.label }}>T</span>
    <input
      key={keyId}
      type="text"
      defaultValue={defaultValue}
      placeholder={placeholder}
      data-testid={testid}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      onBlur={(e) => onCommit(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{ border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: 12, color: theme.ink, width: 64 }}
    />
  </div>
);

// Floating popover anchored under its trigger button (arrow on top)
const Popover = ({ theme, width, children }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    style={{
      position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
      background: theme.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 10,
      boxShadow: PANEL_SHADOW, padding: 10, zIndex: 20, width,
    }}
  >
    <span
      style={{
        position: "absolute", top: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
        width: 9, height: 9, background: theme.panel,
        borderLeft: `1px solid ${theme.borderStrong}`, borderTop: `1px solid ${theme.borderStrong}`,
      }}
    />
    {children}
  </div>
);

// 4-column swatch grid for the color popover. `allowAuto` adds a multi-color
// "Auto" swatch (fibonacci per-level colors) that clears the override.
const SwatchGrid = ({ value, onPick, theme, allowAuto }) => (
  <div>
    <div style={popTitleStyle(theme)}>Color</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 22px)", gap: 7 }}>
      {allowAuto && (
        <button
          title="Auto (multi-color)"
          onClick={() => onPick(null)}
          style={{
            width: 22, height: 22, borderRadius: 6, cursor: "pointer", padding: 0,
            background: "linear-gradient(90deg,#787b86 0%,#089981 40%,#f7a600 70%,#787b86 100%)",
            border: !value ? `2px solid ${theme.accent}` : `1.5px solid ${theme.chipBorder}`, outline: "none",
          }}
        />
      )}
      {COLORS.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => onPick(c)}
          style={{
            width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", padding: 0,
            border: value === c ? `2px solid ${theme.accent}` : `1.5px solid ${theme.chipBorder}`, outline: "none",
          }}
        />
      ))}
    </div>
  </div>
);

// ── "My Settings" — named presets, lives inside the gear popover ──
const PresetsSection = ({ sel, theme, onPropertyChange }) => {
  const [, setVersion] = useState(0);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const feedbackTimerRef = useRef(null);
  const dragItemRef = useRef(null);
  useEffect(() => () => clearTimeout(feedbackTimerRef.current), []);

  const presets = listPresets(sel.type);
  const active = getActivePresetName(sel.type);
  const bump = () => setVersion((v) => v + 1);

  // Save is enabled only when the typed name is new and unique
  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !presets.some((p) => p.name === trimmedName);

  // Update is enabled only when the current settings differ from the active
  // preset (dirty tracking) — compare the whitelisted style fields for this type.
  const activePreset = active ? presets.find((p) => p.name === active) : null;
  const isDirty = activePreset
    ? getSavedFields(sel.type).some(
        (f) => JSON.stringify(sel[f] ?? null) !== JSON.stringify(activePreset.style[f] ?? null)
      )
    : false;

  const handleUpdate = () => {
    if (!active || !isDirty) return;
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
    setListOpen(false);
  };

  const handleDragStart = (e, n) => { dragItemRef.current = n; e.dataTransfer.effectAllowed = "move"; };
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

  const saveNew = () => {
    if (!canSave) return;
    savePreset(sel.type, trimmedName, sel);
    setName("");
    bump();
  };

  const nameRow = (
    <div style={{ display: "flex", gap: 6, marginTop: presets.length ? 7 : 0 }}>
      <input
        type="text"
        data-testid="drawing-panel-preset-name-input"
        placeholder="Name these settings…"
        value={name}
        maxLength={MAX_PRESET_NAME_LENGTH}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canSave) saveNew(); }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...fieldInputStyle(theme), flex: 1, minWidth: 0 }}
      />
      <button
        data-testid="drawing-panel-preset-save-btn"
        title={canSave ? "Save current settings under this name" : trimmedName ? `"${trimmedName}" already exists — use Update` : "Enter a unique name to save"}
        disabled={!canSave}
        onClick={saveNew}
        className={canSave ? "btn-gradient" : undefined}
        style={{
          ...smallBtnStyle(theme),
          ...(canSave
            ? { background: undefined, color: undefined, borderColor: "transparent" }
            : { color: theme.label, borderColor: theme.fieldBorder, background: theme.fieldBg }),
          cursor: canSave ? "pointer" : "default",
          opacity: canSave ? 1 : 0.5,
        }}
      >
        Save
      </button>
    </div>
  );

  return (
    <div style={{ width: 210 }}>
      <div style={popTitleStyle(theme)}>My Settings</div>

      {presets.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              data-testid="drawing-panel-preset-dropdown-trigger"
              onClick={() => setListOpen((o) => !o)}
              style={{
                ...fieldInputStyle(theme), flex: 1, minWidth: 0, display: "flex", alignItems: "center",
                justifyContent: "space-between", cursor: "pointer", gap: 4,
                color: active ? theme.ink : theme.label,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {active ?? "— select settings —"}
              </span>
              <ChevronInline c={theme.label} />
            </button>
            {active && (
              <>
                <button
                  data-testid="drawing-panel-preset-update-btn"
                  title={isDirty ? `Update "${active}" with current settings` : `"${active}" is already up to date`}
                  disabled={!isDirty && !feedback}
                  onClick={handleUpdate}
                  style={{
                    ...smallBtnStyle(theme), padding: "0 10px",
                    color: isDirty || feedback ? theme.accent : theme.label,
                    borderColor: isDirty || feedback ? theme.accent : theme.fieldBorder,
                    background: isDirty || feedback ? theme.accentSoft : theme.fieldBg,
                    cursor: isDirty ? "pointer" : "default",
                    opacity: isDirty || feedback ? 1 : 0.5,
                  }}
                >
                  {feedback ? "✓" : "Update"}
                </button>
                <button
                  data-testid="drawing-panel-preset-delete-btn"
                  title={`Delete "${active}"`}
                  onClick={() => { deletePreset(sel.type, active); bump(); }}
                  style={{ ...smallBtnStyle(theme), width: 30, padding: 0, display: "grid", placeItems: "center" }}
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {listOpen && (
            <div
              style={{
                marginTop: 6, border: `1px solid ${theme.fieldBorder}`, borderRadius: 7,
                overflow: "hidden", maxHeight: 120, overflowY: "auto",
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
                    onClick={() => applyPreset(n)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                      background: isActive ? theme.accentSoft : "transparent",
                      borderBottom: `1px solid ${theme.border}`, cursor: "pointer", userSelect: "none",
                      fontSize: 13, color: isActive ? theme.accent : theme.ink, fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
                    {isActive && <span style={{ fontSize: 11 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {nameRow}
    </div>
  );
};

/**
 * Floating drawing-tool settings — a single slim horizontal strip that floats
 * beside the selected drawing. Color, presets and (for fibonacci) levels tuck
 * into popovers so nothing covers the chart. One control set per tool type.
 */
const DrawingPropertiesPanel = ({ panelDrawing, isDark, onPropertyChange, propsPanelRef }) => {
  const sel = panelDrawing;

  const [drag, setDrag] = useState(null); // { startX, startY, initLeft, initTop }
  const [openPop, setOpenPop] = useState(null); // null | "color" | "preset" | "levels"

  const handleHeaderDown = (e) => {
    if (!propsPanelRef?.current) return;
    const r = propsPanelRef.current.getBoundingClientRect();
    // Switch from right/center anchoring to explicit left so imperative drag works
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
      propsPanelRef.current.style.top = `${drag.initTop + e.clientY - drag.startY}px`;
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]); // eslint-disable-line

  // Close any open popover on an outside click
  useEffect(() => {
    if (!openPop) return;
    const close = () => setOpenPop(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openPop]);

  // Collapse popovers when switching to a different drawing
  useEffect(() => { setOpenPop(null); }, [sel?.id]);

  if (!sel || !PANEL_TYPES.includes(sel.type)) return null;

  const theme = buildTheme(isDark);
  const set = (changes) => onPropertyChange?.(sel.id, changes);
  const togglePop = (which) => (e) => { e.stopPropagation(); setOpenPop((p) => (p === which ? null : which)); };

  // Color control = chip button + swatch popover. `def` is the fallback color.
  const colorControl = (value, def, allowAuto = false) => (
    <div key="color" style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        data-testid="drawing-panel-color-btn"
        title="Color"
        onClick={togglePop("color")}
        style={iconBtnStyle(theme, openPop === "color")}
      >
        <span
          style={{
            width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${theme.chipBorder}`, flex: "0 0 auto",
            background: value || (allowAuto ? "linear-gradient(90deg,#787b86,#089981,#f7a600,#787b86)" : def),
          }}
        />
        <ChevronInline c={theme.label} />
      </button>
      {openPop === "color" && (
        <Popover theme={theme}>
          <SwatchGrid value={value ?? (allowAuto ? null : def)} onPick={(c) => set({ color: c })} theme={theme} allowAuto={allowAuto} />
        </Popover>
      )}
    </div>
  );

  // ── Per-type control sets ──
  const controls = [];

  if (sel.type === "text") {
    controls.push(
      <LtText key="text" keyId={`label-${sel.id}-${sel.label}`} defaultValue={sel.label || ""} placeholder="Text…"
        onCommit={(v) => set({ label: v })} theme={theme} />,
      <LtSelect key="size" title="Text size" value={sel.fontSize || 14} theme={theme}
        onChange={(e) => set({ fontSize: Number(e.target.value) })}>
        {[12, 14, 16, 18, 20, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
      </LtSelect>,
      <Divider key="d1" theme={theme} />,
      colorControl(sel.color, "#f7a600"),
    );
  } else if (sel.type === "rectangle") {
    controls.push(
      <LtText key="text" testid="drawing-panel-rect-text-input" keyId={`label-${sel.id}-${sel.label}`}
        defaultValue={sel.label || ""} placeholder="Text inside box…" onCommit={(v) => set({ label: v })} theme={theme} />,
      <LtSelect key="size" testid="drawing-panel-rect-text-size-select" title="Text size" value={sel.fontSize || 13}
        theme={theme} onChange={(e) => set({ fontSize: Number(e.target.value) })}>
        {[10, 12, 13, 14, 16, 18, 20, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
      </LtSelect>,
      <LtSelect key="pos" testid="drawing-panel-rect-text-pos-select" title="Text position" value={sel.labelPos || "top-left"}
        theme={theme} onChange={(e) => set({ labelPos: e.target.value })}>
        <option value="top-left">Top left</option>
        <option value="top-center">Top center</option>
        <option value="center">Center</option>
        <option value="bottom-left">Bottom left</option>
      </LtSelect>,
      <Divider key="d1" theme={theme} />,
      colorControl(sel.color, "#1E53E5"),
      <LtSelect key="style" title="Border" value={sel.lineStyle || "solid"} theme={theme}
        onChange={(e) => set({ lineStyle: e.target.value })}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </LtSelect>,
      <LtSelect key="width" title="Thickness" value={sel.lineWidth || 1} theme={theme}
        onChange={(e) => set({ lineWidth: Number(e.target.value) })}>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
      </LtSelect>,
    );
  } else if (sel.type === "fibonacci") {
    const levels = sel.levels?.length ? sel.levels : DEFAULT_FIB_LEVELS;
    const setLevel = (i, changes) => set({ levels: levels.map((l, idx) => (idx === i ? { ...l, ...changes } : l)) });
    const visibleCount = levels.filter((l) => l.visible !== false).length;
    controls.push(
      colorControl(sel.color, "#089981", true),
      <LtSelect key="style" title="Lines" value={sel.lineStyle || "auto"} theme={theme}
        onChange={(e) => set({ lineStyle: e.target.value === "auto" ? null : e.target.value })}>
        <option value="auto">Auto</option>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </LtSelect>,
      <LtSelect key="weight" title="Weight" value={sel.lineWidth || 1} theme={theme}
        onChange={(e) => set({ lineWidth: Number(e.target.value) })}>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
      </LtSelect>,
      <LtSelect key="labels" title="Labels" value={sel.showLabels === false ? "hide" : "show"} theme={theme}
        onChange={(e) => set({ showLabels: e.target.value === "show" })}>
        <option value="show">Show</option>
        <option value="hide">Hide</option>
      </LtSelect>,
      <div key="levels" style={{ position: "relative", flex: "0 0 auto" }}>
        <button title="Levels" onClick={togglePop("levels")} style={{ ...iconBtnStyle(theme, openPop === "levels"), fontSize: 13, fontWeight: 600 }}>
          Levels ({visibleCount}/{levels.length})
          <ChevronInline c={theme.label} />
        </button>
        {openPop === "levels" && (
          <Popover theme={theme} width={210}>
            <div style={popTitleStyle(theme)}>Levels</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 200, overflowY: "auto" }}>
              {levels.map((lvl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" data-testid={`fib-level-visible-${i}`} checked={lvl.visible !== false}
                    onChange={(e) => setLevel(i, { visible: e.target.checked })} style={{ cursor: "pointer", margin: 0 }} />
                  <input type="number" step="0.001" data-testid={`fib-level-value-${i}`} key={`r-${i}-${lvl.r}`}
                    defaultValue={lvl.r}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                    onBlur={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setLevel(i, { r: v }); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ ...fieldInputStyle(theme), width: 70, height: 26, padding: "0 6px" }} />
                  <input type="color" data-testid={`fib-level-color-${i}`} value={lvl.color}
                    onChange={(e) => setLevel(i, { color: e.target.value })} title="Level color"
                    style={{ width: 26, height: 22, padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
                </div>
              ))}
            </div>
          </Popover>
        )}
      </div>,
    );
  } else if (sel.type === "rr") {
    controls.push(
      <LtSelect key="fill" title="Fill" value={String(sel.fillOpacity ?? 0.18)} theme={theme}
        onChange={(e) => set({ fillOpacity: Number(e.target.value) })}>
        <option value="0.08">Low</option>
        <option value="0.18">Medium</option>
        <option value="0.32">High</option>
      </LtSelect>,
      <LtSelect key="labels" title="Labels" value={sel.showLabels === false ? "hide" : "show"} theme={theme}
        onChange={(e) => set({ showLabels: e.target.value === "show" })}>
        <option value="show">Show</option>
        <option value="hide">Hide</option>
      </LtSelect>,
      <LtSelect key="entry" title="Entry line" value={sel.lineStyle || "solid"} theme={theme}
        onChange={(e) => set({ lineStyle: e.target.value })}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </LtSelect>,
      <Divider key="d1" theme={theme} />,
      <LtText key="text" testid="drawing-panel-rr-text-input" keyId={`label-${sel.id}-${sel.label}`}
        defaultValue={sel.label || ""} placeholder="Label on box…" onCommit={(v) => set({ label: v })} theme={theme} />,
      <LtSelect key="pos" testid="drawing-panel-rr-text-pos-select" title="Text position" value={sel.labelPos || "top-left"}
        theme={theme} onChange={(e) => set({ labelPos: e.target.value })}>
        <option value="top-left">Top left</option>
        <option value="top-right">Top right</option>
        <option value="center">Center</option>
        <option value="bottom-left">Bottom left</option>
      </LtSelect>,
    );
  } else if (sel.type === "segment") {
    controls.push(
      <LtText key="text" testid="drawing-panel-segment-text-input" keyId={`label-${sel.id}-${sel.label}`}
        defaultValue={sel.label || ""} placeholder="Label on line…" onCommit={(v) => set({ label: v })} theme={theme} />,
      <LtSelect key="pos" testid="drawing-panel-segment-text-pos-select" title="Text position" value={sel.labelPos || "middle"}
        theme={theme} onChange={(e) => set({ labelPos: e.target.value })}>
        <option value="middle">On middle</option>
        <option value="start">Start</option>
        <option value="end">End</option>
      </LtSelect>,
      <LtSelect key="size" testid="drawing-panel-segment-text-size-select" title="Text size" value={sel.fontSize || 11}
        theme={theme} onChange={(e) => set({ fontSize: Number(e.target.value) })}>
        {[10, 11, 12, 13, 14, 16, 18, 20].map((s) => <option key={s} value={s}>{s}px</option>)}
      </LtSelect>,
      <Divider key="d1" theme={theme} />,
      colorControl(sel.color, "#f7a600"),
      <LtSelect key="style" title="Style" value={sel.lineStyle || "solid"} theme={theme}
        onChange={(e) => set({ lineStyle: e.target.value })}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </LtSelect>,
      <LtSelect key="width" title="Thickness" value={sel.lineWidth || 1} theme={theme}
        onChange={(e) => set({ lineWidth: Number(e.target.value) })}>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
      </LtSelect>,
    );
  } else {
    // Line tools — trendline / extline / ray / hline / vline
    controls.push(
      colorControl(sel.color, "#1E53E5"),
      <LtSelect key="style" title="Style" value={sel.lineStyle || "solid"} theme={theme}
        onChange={(e) => set({ lineStyle: e.target.value })}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </LtSelect>,
      <LtSelect key="width" title="Thickness" value={sel.lineWidth || 1} theme={theme}
        onChange={(e) => set({ lineWidth: Number(e.target.value) })}>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
      </LtSelect>,
    );
  }

  return (
    <div
      ref={propsPanelRef}
      data-testid="drawing-properties-panel"
      title={TOOL_LABELS[sel.type] || sel.type}
      style={{
        position: "fixed", top: 12, left: 12, zIndex: 9999,
        display: "inline-flex", alignItems: "center", gap: 0, width: "max-content",
        background: theme.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
        boxShadow: PANEL_SHADOW, padding: 4, userSelect: "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Grip theme={theme} onMouseDown={handleHeaderDown} dragging={!!drag} />
      <Divider theme={theme} />

      {controls}

      <Divider theme={theme} />

      {/* My Settings — gear button opens the presets popover */}
      <div style={{ position: "relative", flex: "0 0 auto" }}>
        <button
          data-testid="drawing-panel-preset-btn"
          title="My settings"
          onClick={togglePop("preset")}
          style={iconBtnStyle(theme, openPop === "preset")}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7.5" cy="7.5" r="5.6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        {openPop === "preset" && (
          <Popover theme={theme} width={230}>
            <PresetsSection sel={sel} theme={theme} onPropertyChange={onPropertyChange} />
          </Popover>
        )}
      </div>
    </div>
  );
};

export default DrawingPropertiesPanel;
