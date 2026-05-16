# src/components/common/ — Shared Components

## Files
| File | Purpose |
|------|---------|
| `ThemeToggle.jsx` | Dark/light mode toggle button. Reads and updates `ThemeContext`. |

## Notes
- `ThemeContext` lives in `src/contexts/ThemeContext.jsx` (note: `contexts/` not `context/`)
- Theme preference is persisted to localStorage so it survives page refreshes
- The toggle is rendered inside `Header.jsx`
- CSS variables for both themes are defined in `src/styles/tokens.css`
