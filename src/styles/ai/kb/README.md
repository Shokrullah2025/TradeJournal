# src/styles/ — Styles

## Structure
```
styles/
├── tokens.css                    CSS custom properties for colours, spacing, typography (dark + light theme)
├── components/
│   ├── layout.css                Main layout (sidebar, header, content area)
│   ├── layout/                   Per-element layout CSS (Header, Sidebar, Footer, Container)
│   ├── profile.css               Profile page styles
│   ├── theme-toggle.css          Theme toggle button styles
│   └── ui/                       Reusable UI element styles (Button, Card, Form, Input, Modal)
└── core/
    ├── layout.css                Base layout resets
    ├── responsive.css            Breakpoints and responsive rules
    ├── typography.css            Font sizes, weights, line heights
    └── variables.css             Additional CSS variable definitions
```

## Theme System
- `tokens.css` defines all CSS variables for both `[data-theme="light"]` and `[data-theme="dark"]`
- `ThemeContext` sets `data-theme` on `<html>` — CSS variables update automatically
- Never hardcode colours in component files — always use a token variable (e.g. `var(--color-bg-primary)`)

## Style Guide
See `STYLE_GUIDE.md` in this folder for conventions on naming, spacing, and component patterns.
