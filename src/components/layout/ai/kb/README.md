# src/components/layout/ — Layout Components

## Files
| File | Purpose |
|------|---------|
| `Sidebar.jsx` | Left navigation sidebar. Collapsible. Contains nav links and a bottom-left icon that opens a dropdown for Profile, Billing, and Sign Out. |
| `Header.jsx` | Top bar. Contains the page title, theme toggle, and user profile info. |

## Layout Notes
- Sidebar is collapsible — collapsed state is stored locally in the component
- Profile, Billing, and Sign Out are grouped under a single icon in the bottom-left corner of the sidebar (not separate sidebar items)
- The header profile icon is separate from the sidebar and gives quick access to profile info
- Layout CSS lives in `src/styles/components/layout/`
