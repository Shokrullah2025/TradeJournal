import React, { useMemo } from "react";
import { sanitizeNoteHtml, noteTextLength } from "../../utils/sanitizeHtml";

// Read-only renderer for a session's rich-text note. The stored HTML is sanitized
// again here (defense in depth — never render unsanitized HTML, CLAUDE.md §2)
// before it touches the DOM via dangerouslySetInnerHTML.
//
// `clamp` limits the preview to N lines and adds an ellipsis when the note
// overflows the card; pass `clamp={0}` to render the full note.
const CLAMP_CLASS = {
  0: "",
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

function NoteView({ html, clamp = 3, className = "", testId = "note-view" }) {
  const clean = useMemo(() => sanitizeNoteHtml(html || ""), [html]);

  // Nothing meaningful to show (empty, or markup with no text).
  if (!clean || noteTextLength(clean) === 0) return null;

  return (
    <div
      data-testid={testId}
      className={`rich-text-content text-sm text-gray-700 dark:text-gray-200 ${
        CLAMP_CLASS[clamp] ?? "line-clamp-3"
      } ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export default NoteView;
