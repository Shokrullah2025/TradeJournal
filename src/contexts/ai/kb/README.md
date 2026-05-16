# src/contexts/ — Theme Context

## Files
| File | Purpose |
|------|---------|
| `ThemeContext.jsx` | Dark/light mode state. Persists preference to `localStorage`. Applies a `data-theme` attribute to `<html>` which CSS variables in `tokens.css` respond to. |

## Notes
- This folder (`contexts/`) is separate from `context/` — `contexts/` holds only the ThemeContext
- All other app state contexts live in `src/context/`
- The `ThemeToggle` component in `src/components/common/` consumes this context
- Theme CSS variables are defined in `src/styles/tokens.css`
