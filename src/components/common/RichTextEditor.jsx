import React, { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Palette } from "lucide-react";
import { sanitizeNoteHtml } from "../../utils/sanitizeHtml";

// A small, dependency-light WYSIWYG for session notes: bold, italic, underline,
// bullet + numbered lists, and text color. Output is sanitized HTML (CLAUDE.md
// §2) emitted via `onChange`; the parent stores the sanitized string.
//
// The contentEditable is intentionally *uncontrolled* during typing — we seed it
// once (and when an external value swaps in while unfocused) but never write back
// to innerHTML on each keystroke, so the caret never jumps.

// Non-blue swatches that read well on light and dark note surfaces.
const TEXT_COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#b45309" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
];

function ToolbarButton({ onAction, title, testId, active, children }) {
  return (
    <button
      type="button"
      data-test-id={testId}
      title={title}
      aria-label={title}
      // Keep the editor selection alive: prevent the button from stealing focus.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAction}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange, placeholder = "", testId = "rich-text-editor" }) {
  const ref = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef(null);

  // Seed / reseed the editor only when not actively editing (mount, or the
  // session being viewed changes) so external updates show without caret jumps.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const incoming = sanitizeNoteHtml(value || "");
    if (el.innerHTML !== incoming) el.innerHTML = incoming;
    setIsEmpty(!el.textContent?.trim());
  }, [value]);

  // Close the color popover on outside click.
  useEffect(() => {
    if (!colorOpen) return;
    const onDoc = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setColorOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [colorOpen]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    setIsEmpty(!el.textContent?.trim());
    onChange(sanitizeNoteHtml(el.innerHTML));
  };

  // execCommand is deprecated but remains the simplest cross-browser way to apply
  // inline formatting to a selection without pulling in a heavy editor library.
  const exec = (command, arg) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const applyColor = (color) => {
    exec("foreColor", color === "inherit" ? "#374151" : color);
    setColorOpen(false);
  };

  return (
    <div
      data-test-id={testId}
      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 overflow-hidden"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <ToolbarButton onAction={() => exec("bold")} title="Bold" testId={`${testId}-bold-btn`}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onAction={() => exec("italic")} title="Italic" testId={`${testId}-italic-btn`}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onAction={() => exec("underline")} title="Underline" testId={`${testId}-underline-btn`}>
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        <ToolbarButton
          onAction={() => exec("insertUnorderedList")}
          title="Bullet list"
          testId={`${testId}-bullet-btn`}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onAction={() => exec("insertOrderedList")}
          title="Numbered list"
          testId={`${testId}-numbered-btn`}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        <div className="relative" ref={colorRef}>
          <ToolbarButton
            onAction={() => setColorOpen((o) => !o)}
            title="Text color"
            testId={`${testId}-color-btn`}
            active={colorOpen}
          >
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          {colorOpen && (
            <div
              data-test-id={`${testId}-color-popover`}
              className="absolute z-30 top-9 left-0 p-2 grid grid-cols-4 gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
            >
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  data-test-id={`${testId}-color-${c.name.toLowerCase()}`}
                  title={c.name}
                  aria-label={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(c.value)}
                  className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ background: c.value === "inherit" ? "#9ca3af" : c.value }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && placeholder && (
          <div
            className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          data-test-id={`${testId}-input`}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder || "Rich text editor"}
          onInput={emit}
          onBlur={emit}
          className="rich-text-content h-28 overflow-y-auto px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none"
        />
      </div>
    </div>
  );
}

export default RichTextEditor;
