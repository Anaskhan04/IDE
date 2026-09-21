# Design System

This document outlines the permanent design system for the IDE project. It is based on the initial design created by KOMBai. **This design must be strictly adhered to and preserved.**

> [!IMPORTANT]
> **AI Coding Agents:** You must read `AGENTS.md` before modifying this project's UI. The existing design system has priority over AI-generated styling. If a genuinely new design token or pattern is required, update this file and `tokens.css` as part of the same change to keep the implementation synchronized.

## Design Philosophy
- **Dark Theme Only**: The IDE is a specialized tool optimized for developer ergonomics, using a flat, precise dark mode.
- **Flat Surfaces**: Separation between sections relies on flat surfaces rather than glows or heavy borders.
- **Consistency**: Centralized CSS tokens ensure consistent colors, sizing, and structure across all components.

## 1. Colors & Theming

The colors are defined as CSS variables in `src/styles/tokens.css` as RGB values (to support Tailwind's opacity feature, e.g., `bg-ide-bg/80`). 

### Layout & Surfaces
| Token | Variable | RGB | Description |
|-------|----------|-----|-------------|
| **Shell** | `--ide-shell` | `8 11 16` | Outermost container background. |
| **Background** | `--ide-bg` | `12 16 23` | Main app background (workspace, code editor). |
| **Sidebar** | `--ide-sidebar`| `11 15 22` | Activity bar and sidebar background. |
| **Panel** | `--ide-panel` | `16 21 32` | Elevated panels, dialogs, dropdowns. |
| **Surface** | `--ide-surface`| `17 24 36` | Secondary surfaces and headers. |
| **Card** | `--ide-card` | `22 28 43` | Distinct blocks of content or widgets. |

### Interactive States
| Token | Variable | RGB | Description |
|-------|----------|-----|-------------|
| **Selected** | `--ide-selected`| `23 34 53` | Selected items (files, tabs, tree nodes). |
| **Hover** | `--ide-hover` | `26 36 51` | Hover state for interactive elements. |
| **Focus** | `--ide-focus` | `59 130 246` | Focus rings and active highlights (Blue). |

### Borders
| Token | Variable | RGB | Description |
|-------|----------|-----|-------------|
| **Border** | `--ide-border` | `32 42 58` | Default border for structural separation. |
| **Border Strong**| `--ide-border-strong`| `43 56 78` | Emphasized borders (e.g., active tabs). |

### Typography Colors
| Token | Variable | RGB | Description |
|-------|----------|-----|-------------|
| **Strong** | `--ide-text-strong`| `245 247 250` | Headings, active states, important values. |
| **Text** | `--ide-text` | `199 208 220` | Default body text. |
| **Muted** | `--ide-text-muted` | `154 167 183` | Secondary text, placeholders. |
| **Subtle** | `--ide-text-subtle`| `113 128 150` | Disabled text, very minor details. |

### Accents & Syntax
| Token | Variable | RGB | Usage |
|-------|----------|-----|-------|
| **Cyan** | `--ide-cyan` | `6 182 212` | Functions, accents. |
| **Emerald** | `--ide-emerald` | `16 185 129` | Success, strings, positive actions. |
| **Amber** | `--ide-amber` | `245 158 11` | Warnings, strings, alerts. |
| **Rose** | `--ide-rose` | `244 63 94` | Errors, keywords, destructive actions. |
| **Purple** | `--ide-purple` | `139 92 246` | Types, special accents. |

---

## 2. Typography

The IDE uses specific system fonts to maintain a lightweight, native feel.

- **Sans-Serif (UI)**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif.
  - *Usage*: All UI elements, sidebars, settings.
  - *Sizes*: Base `text-[13px]`, titles `0.875rem (14px)`, meta/small `0.75rem (12px)` and `0.6875rem (11px)`.
- **Monospace (Code)**: `JetBrains Mono`, Fira Code, Cascadia Code, Consolas, monospace.
  - *Usage*: Code editor, file paths, terminal output.

### Typographic Classes
Custom utility classes are defined in `src/index.css`:
- `.ide-text-title`: Strong white (`--ide-text-strong`), 14px, 600 weight, slightly tight spacing.
- `.ide-text-body`: Standard text (`--ide-text`), 12px, 1.5 line-height.
- `.ide-text-meta`: Muted mono text (`--ide-text-muted`), 11px, 1.4 line-height.

---

## 3. Structural Properties

### Border Radius
- **Controls**: `--ide-control-radius` (4px). Used for buttons, inputs, small widgets.
- **Panels**: `--ide-panel-radius` (6px). Used for modals, cards, floating panes.

### Shadows
Use Tailwind's default shadow scale for elevation:
- `shadow-sm`
- `shadow-md`
- `shadow-lg`

### Spacing & Sizing
- Use Tailwind's default spacing scale (`p-1`, `p-2`, `m-4`, `gap-2`).
- **Touch Target**: Minimum height `40px` (`min-h-touch-target`) for interactive elements on touch-capable interfaces.

---

## 4. UI Patterns & Components

### Buttons
Buttons should use the standard radius (`rounded-ide-control`) and flat colors.
- **Primary**: `bg-ide-focus text-ide-text-strong hover:bg-ide-focus/90`
- **Secondary**: `bg-ide-surface text-ide-text hover:bg-ide-hover border border-ide-border`
- **Icon Buttons**: `text-ide-text-muted hover:text-ide-text hover:bg-ide-hover rounded-ide-control p-1`

### Inputs
- Background: `bg-ide-bg` or `bg-ide-surface`
- Border: `border-ide-border`
- Text: `text-ide-text`
- Focus: `focus:outline-none focus:ring-1 focus:ring-ide-focus focus:border-ide-focus`

### Navigation & Tabs
- Inactive tabs: `text-ide-text-muted hover:text-ide-text hover:bg-ide-hover`
- Active tabs: `text-ide-text-strong bg-ide-surface border-t-2 border-ide-focus` (or similar emphasis).

### Focus Rings
Always preserve the custom focus ring behavior.
- `.ide-focus-ring`: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-ide-focus focus-visible:outline-offset-2`

### Modals & Dialogs
- Background: `bg-ide-panel`
- Border: `border border-ide-border`
- Radius: `rounded-ide-panel`
- Shadow: `shadow-lg` (or `--ide-shadow-lg`)

## 5. Usage Rules
- **Do not introduce new hex codes.** Always use `bg-ide-*`, `text-ide-*`, `border-ide-*`.
- **Do not add new fonts.** Stick to `font-sans` and `font-mono` as configured.
- **Maintain the flat aesthetic.** Do not add heavy drop shadows or glows where they don't already exist. Separation is achieved through borders (`border-ide-border`) and slight background variations (`bg-ide-bg` vs `bg-ide-surface`).
