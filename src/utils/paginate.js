// Tiny, pure pagination helpers shared by list views (e.g. the Backtest
// "Recent Sessions" list). Kept framework-free so they unit-test in isolation
// without rendering the page.

// Number of pages needed to show `total` items at `pageSize` per page.
// Always at least 1 so an empty list still has a valid (empty) first page.
export function getPageCount(total, pageSize) {
  if (!pageSize || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

// Clamp a (possibly stale) page index into [0, pageCount - 1]. Guards against a
// page that fell out of range after the list shrank or the page size changed.
export function clampPage(page, pageCount) {
  const maxPage = Math.max(0, pageCount - 1);
  if (!Number.isFinite(page)) return 0;
  return Math.min(Math.max(0, page), maxPage);
}

// The slice of `list` visible on `page` (0-indexed) at `pageSize` per page.
export function getPageSlice(list, page, pageSize) {
  if (!Array.isArray(list) || !pageSize || pageSize <= 0) return [];
  const start = Math.max(0, page) * pageSize;
  return list.slice(start, start + pageSize);
}
