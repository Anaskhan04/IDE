# IntelliCode Design System 2.0

This document is the permanent, authoritative design system for IntelliCode. All UI work—new components, refactors, dialogs, panels, and themes—must strictly follow this specification.

> [!IMPORTANT]
> **AI Coding Agents & Contributors:** Read `AGENTS.md` and this document before modifying any UI. Do not invent competing design tokens, raw hex colors, ad-hoc Tailwind palette classes (`slate-*`, `cyan-*`, `blue-*`), or unapproved typography. When a genuinely new semantic token is approved, update `DESIGN_SYSTEM.md`, `src/styles/tokens.css`, and `tailwind.config.js` together.

---

## 1. Design Philosophy

- **Precision over decoration:** Flat, crisp surfaces with subtle 1px borders; no decorative gradients, neon glows, or excessive drop shadows.
- **Clarity over complexity:** Every visible element must earn its place and support the developer's active task.
- **Content over application chrome:** The code editor, Knowledge Graph canvas, and conversation stream are the primary surfaces; surrounding bars stay quiet.
- **Consistency over isolated polish:** Shared primitives (`Button`, `IconButton`, `Input`, `Dialog`, `Tabs`, `Badge`, `EmptyState`) govern every surface.
- **Progressive disclosure:** Essential workflows stay immediately accessible; advanced controls (API keys, custom endpoints, raw queries, GitHub CLI/PAT) live in structured secondary views or collapsed sections.
- **Local-first, developer-controlled:** Local workspace features require no account; external services (GitHub, AI providers) are clearly separated and optional.

---

## 2. Semantic Tokens & Theme Architecture

Colors are defined as RGB triplets in `src/styles/tokens.css` (e.g., `--ide-bg: 16 17 20`) so Tailwind opacity modifiers (`bg-ide-panel/80`) work seamlessly across themes.

### IntelliCode Obsidian (Default Dark Theme)

| Semantic Role | CSS Variable | Tailwind Token | Hex | RGB | Usage |
|---|---|---|---|---|---|
| **Workspace** | `--ide-bg` | `ide-bg` | `#101114` | `16 17 20` | Primary editor, graph canvas, main working surface |
| **Application chrome** | `--ide-shell` | `ide-shell` | `#141519` | `20 21 25` | Top bar, activity bar, sidebar, tab strip, status bar |
| **Elevated surface** | `--ide-panel` / `--ide-surface` | `ide-panel` / `ide-surface` | `#1B1D22` | `27 29 34` | Cards, panels, dialogs, dropdowns, inputs |
| **Hover surface** | `--ide-hover` | `ide-hover` | `#23262D` | `35 38 45` | Interactive hover background |
| **Selected surface** | `--ide-selected` | `ide-selected` | `#292E38` | `41 46 56` | Active tree items, selected list rows, active chips |
| **Subtle border** | `--ide-border` | `ide-border` | `#292C33` | `41 44 51` | Structural dividers, panel seams, default input borders |
| **Strong border** | `--ide-border-strong` | `ide-border-strong` | `#363B45` | `54 59 69` | Emphasized input/dialog borders, active separators |
| **Primary text** | `--ide-text` / `--ide-text-strong` | `ide-text` / `ide-strong` | `#E6E8EC` | `230 232 236` | Headings, active labels, primary body copy |
| **Secondary text** | `--ide-text-muted` | `ide-muted` | `#A1A6B0` | `161 166 176` | Descriptions, inactive tabs, supporting metadata |
| **Muted text** | `--ide-text-subtle` | `ide-subtle` | `#777E8A` | `119 126 138` | Placeholders, disabled labels, low-emphasis hints |
| **Primary accent** | `--ide-focus` | `ide-focus` / `ide-accent` | `#5B8DEF` | `91 141 239` | Primary buttons, focus rings, active indicators |
| **Accent hover / pressed** | `--ide-accent-hover` / `--ide-accent-pressed` | `ide-accent-hover` / `ide-accent-pressed` | `#4A7DE0` / `#3D6FD0` | `74 125 224` / `61 111 208` | Hover and pressed states for primary accent controls |
| **On-accent foreground** | `--ide-on-accent` | `ide-on-accent` | `#0C111B` | `12 17 27` | High-contrast text/icons on primary accent fills |
| **Destructive** | `--ide-destructive` / `--ide-destructive-hover` | `ide-destructive` / `ide-destructive-hover` | `#E06C75` / `#CE5A64` | `224 108 117` / `206 90 100` | Destructive buttons and danger fills |
| **On-destructive foreground** | `--ide-on-destructive` | `ide-on-destructive` | `#12090B` | `18 9 11` | High-contrast text/icons on destructive fills |
| **Pressed surface** | `--ide-pressed` | `ide-pressed` | `#2E333E` | `46 51 62` | Pressed state for neutral interactive controls |
| **Overlay** | `--ide-overlay` | `ide-overlay` | `rgba(10,11,14,0.72)` | `10 11 14` | Modal/dialog backdrop overlay |
| **Success** | `--ide-emerald` | `ide-emerald` | `#43B581` | `67 181 129` | Connected states, passing checks, clean sync |
| **Warning** | `--ide-amber` | `ide-amber` | `#E0AE59` | `224 174 89` | Warnings, dirty/unsaved indicators, caution states |
| **Error** | `--ide-rose` | `ide-rose` | `#E06C75` | `224 108 117` | Errors, failed checks, destructive actions |
| **Information** | `--ide-cyan` | `ide-cyan` | `#78A9E6` | `120 169 230` | Informational badges, links, symbol highlights |
| **Intelligence** | `--ide-purple` | `ide-purple` | `#A78BFA` | `167 139 250` | AI assistant, AST/Knowledge Graph intelligence cues |

### Light Theme Parity

Supported light themes (`html.light` / `[data-theme="light"]`) must override the exact same CSS variables with equivalent contrast:
- Workspace `#FFFFFF`, Chrome `#F6F7F9`, Elevated `#FFFFFF` / `#F0F2F5`, Hover `#EAECEF`, Selected `#E1E6F0`, Subtle border `#DFE2E8`, Strong border `#C6CCD6`, Primary text `#16181D`, Secondary text `#4F5663`, Muted text `#6E7685`, Primary accent `#3B6FD8`, Success `#238656`, Warning `#B7791F`, Error `#C94A54`, Info `#2B6CB0`, Intelligence `#7C5CFA`.

### Contrast Validation
- `#E6E8EC` on `#101114` (`15.6:1`) and `#1B1D22` (`13.8:1`) — exceeds WCAG AAA.
- `#A1A6B0` on `#101114` (`7.3:1`) and `#1B1D22` (`6.5:1`) — exceeds WCAG AA/AAA.
- `#777E8A` on `#101114` (`4.55:1`) — meets WCAG AA for normal text; use `#A1A6B0` when placed on `#1B1D22` or `#23262D` for comfortable readability.
- Primary accent `#5B8DEF` buttons with `#101114` or `#FFFFFF` text must verify ≥ 4.5:1 (`#101114` on `#5B8DEF` = `6.1:1`; prefer dark `#101114` or high-contrast `#FFFFFF` on darkened `#3E72DC` hover/fill).

---

## 3. Typography

- **Interface Font (`font-sans`):** `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif` (locally bundled when packaged, with system fallbacks).
- **Code & Terminal Font (`font-mono`):** `"JetBrains Mono"`, `"Fira Code"`, `"Cascadia Code"`, `Consolas`, `monospace`.

### Type Scale

| Role | Size | Weight | Line Height | Font |
|---|---|---|---|---|
| **Main heading** | `20px` (`1.25rem`) | `600` | `1.3` | `font-sans` |
| **Dialog title** | `18px` (`1.125rem`) | `600` | `1.35` | `font-sans` |
| **Section heading** | `14px` (`0.875rem`) | `600` | `1.4` | `font-sans` |
| **Standard UI** | `13px` (`0.8125rem`) | `400` | `1.45` | `font-sans` |
| **Buttons** | `13px` (`0.8125rem`) | `500` | `1.2` | `font-sans` |
| **Supporting text** | `12px` (`0.75rem`) | `400` | `1.45` | `font-sans` |
| **Status bar** | `11–12px` (`0.6875–0.75rem`) | `400–500` | `1.3` | `font-sans` (`font-mono` only for line/col & counters) |
| **Code editor** | `14px` (`0.875rem`) | `400` | `1.6` | `font-mono` (user-configurable) |
| **Terminal** | `13px` (`0.8125rem`) | `400` | `1.5` | `font-mono` |

> [!WARNING]
> **No `font-mono` on ordinary UI:** Never apply `font-mono` to navigation tabs, descriptions, buttons, dialog titles, or section headings. Reserve `font-mono` strictly for code, file paths, terminal output, keybindings (`Ctrl+K`), commit hashes, and numeric line/column coordinates.

---

## 4. Spacing & Layout Dimensions

### 4px Spacing Scale
Use only multiples of 4px: `4px` (`1`), `8px` (`2`), `12px` (`3`), `16px` (`4`), `20px` (`5`), `24px` (`6`), `32px` (`8`), `40px` (`10`), `48px` (`12`).

### Target Shell Dimensions

| Surface / Control | Default Dimension | Notes |
|---|---|---|
| **Top bar** | `44px` height | Compact single-row navigation & search |
| **Activity bar** | `48px` width | Primary vertical icon rail |
| **Explorer / Sidebar** | `248px` default width | Resizable (`200px`–`420px`) |
| **Workspace & file tabs** | `36px` height | Consistent tab height across modes and editor |
| **Explorer tree rows** | `28px` height | Clean 12px/16px indentation per depth level |
| **Buttons & icon button targets** | `32px` height | `32px × 32px` for standard icon buttons |
| **Status bar** | `24px` height | Minimal branch, diagnostics, cursor, language |
| **AI sidebar** | `360px` default width | Resizable (`300px`–`520px`) |
| **Panel padding** | `16px` | Standard internal padding for panels |
| **Dialog padding** | `24px` | Header, body, and footer spacing in modals |

---

## 5. Radius & Elevation

| Element | Border Radius | Elevation / Border |
|---|---|---|
| **Docked workspace panels** | `0px` | Separated by `1px solid` `--ide-border`, no shadow |
| **Small controls (badges, chips, tree rows)** | `4px` | Flat or `1px` subtle border |
| **Buttons & inputs** | `6px` | `1px` border (`--ide-border` / `--ide-border-strong`) |
| **Menus, popovers & cards** | `8px` | `1px` border `--ide-border-strong`, `shadow-md` |
| **Dialogs / Modals** | `12px` | `1px` border `--ide-border-strong`, `shadow-lg` |
| **Avatars & status dots** | `9999px` (`rounded-full`) | `1px` border when needed |

---

## 6. Iconography

- **Single library:** `lucide-react` exclusively.
- **Standard controls:** `16px` (`h-4 w-4`), `strokeWidth={1.75}`.
- **Primary navigation (ActivityBar):** `20px` (`h-5 w-5`), `strokeWidth={1.75}`.
- **Accessibility rule:** Every icon-only button **must** have both a descriptive `title` (tooltip) and `aria-label`. Decorative icons inside labeled buttons must use `aria-hidden="true"`.

---

## 7. Component Specifications & Interaction States

Shared primitives live in `src/components/ui/`:
- `Button` (`primary`, `secondary`, `ghost`, `danger`, `sm`/`md`)
- `IconButton` (`32px` target, required `aria-label` + `title`)
- `Input` & `Textarea` (standard `6px` radius, `32px` height for single-line, error border state)
- `Select` & `Checkbox`
- `Dialog` (backdrop, `12px` radius, `24px` padding, `Escape` + backdrop close, focus management)
- `Menu` / `Popover` (`8px` radius, click-outside + `Escape` close)
- `Tabs` (`36px` height, `2px` bottom or top indicator)
- `Badge` (`neutral`, `accent`, `success`, `warning`, `error`, `intelligence`)
- `EmptyState`, `LoadingState`, `ErrorState`, `NotificationBanner`, `Divider`, `Tooltip`

### Required Interactive States
Every interactive component must explicitly define:
1. **Default** — resting surface and border.
2. **Hover** — `bg-ide-hover` (120–200ms transition).
3. **Pressed** — subtle darker/active feedback (`active:opacity-90` or `bg-ide-selected`).
4. **Focused** — visible keyboard focus ring (`2px solid rgb(var(--ide-focus))`, `outline-offset: 2px`).
5. **Selected** — `bg-ide-selected` + `text-ide-strong` or `2px` `--ide-focus` indicator.
6. **Loading** — spinner + disabled interaction + honest status text.
7. **Disabled** — `opacity-50`, `cursor-not-allowed`, no hover shift.
8. **Error** — `border-ide-rose` + `text-ide-rose` + actionable recovery control.

Transitions: `120ms–200ms ease` (`color`, `background-color`, `border-color`, `opacity`). Always wrap transitions/animations with `@media (prefers-reduced-motion: reduce)` support.

---

## 8. UX Writing Standards

Use concise, natural, sentence-case UI copy:

| Prefer | Avoid |
|---|---|
| `AI models` | `AI Model Gateway & Custom Providers` |
| `Project context` | `AST + Graph Context` |
| `Call hierarchy` | `Call Tracer (BFS)` |
| `Details` | `Evidence` |
| `Impact` | `Blast Radius` |
| `Open file` | `Open in code editor` |
| `Refresh models` | `Sync Live Models` |
| `Connect GitHub` | `Browser OAuth Sign-In` |

Preserve accurate technical terminology where precision is required (e.g., `TypeScript`, `Git`, `Cypher`, `AST`), without marketing hype or fabricated metrics.

---

## 9. Accessibility, Navigation Ownership & Responsive Behavior

### Navigation Ownership (Target Architecture for Phase C)
- **Top bar (`44px`):** Project identity, global command search, AI Assistant toggle, and Accounts & Services menu.
- **Activity bar (`48px`):** Primary view rail — Explorer, Search, Source Control, Knowledge Graph, Impact, and Tools (grouping MCP Hub, Validation, Benchmarking, and specialized utilities).
- **Main workspace:** Active code editor or selected intelligence view.
- **Right sidebar (`360px`):** AI Assistant or contextual inspection details.
- **Bottom panel:** Integrated Terminal, Problems, and command output.
- **Settings:** Preferences, themes, AI providers, and advanced configuration.
- **Status bar (`24px`):** Essential Git branch/sync status, diagnostic counts, and active editor cursor/language.

### Accessibility Standards
- **Contrast & Foreground Pairs:** Validate actual foreground/background pairs (`>= 4.5:1` normal text, `>= 3:1` UI boundaries). Accent fills use `--ide-on-accent`; destructive fills use `--ide-on-destructive`.
- **Border Semantics:** Distinguish decorative panel dividers (`--ide-border`) from essential interactive control boundaries (`--ide-border-strong`).
- **Dialogs:** Trap keyboard focus inside open dialogs, focus the first interactive element on open, restore focus to the triggering element on close, and protect unsaved forms from accidental backdrop/`Escape` dismissal.
- **Menus, Tabs & Trees:** Support arrow-key navigation (`Up`/`Down` in menus, `Left`/`Right`/`Home`/`End` in tabs and trees), `Enter`/`Space` activation, and `Escape` dismissal.
- **Forms & Validation:** Every input/select/textarea must have an explicit `<label>` (or `aria-label`), `aria-invalid`, and `aria-describedby` linking to validation feedback.
- **Keyboard-Accessible Resizing:** All `ResizablePanel` splitters must expose `role="separator"`, `tabIndex={0}`, `aria-valuenow`/`min`/`max`, and arrow-key resizing.
- **User Preferences:** Respect `prefers-reduced-motion`, browser zoom (`100%–200%`), and user-configured editor font sizes.
- **Viewports:** Shell must remain usable without horizontal page overflow or clipped dialogs at `1280×720`, `1440×900`, and `1920×1080`.

### Planned Phase C Regression Task: Editor Tab & Breadcrumb Sync
- Fixed in Phase C via `reconcileEditorTabs` (`src/utils/editorTabState.ts`) and per-file cursor/scroll preservation in `CodeEditor.tsx`.

---

## 10. Phase D Feature Patterns (Assistant, Model Picker, Providers & Settings)

- **AI Assistant (`ModelGatewayChat.tsx`):** Conversation-first `Inter` (`13px`) layout, clean empty state (no artificial welcome messages), `JetBrains Mono` (`13px`) inside fenced code blocks and diff paths, compact removable file-context chips, on-demand `Project context` inspector, inline model selector in the composer, and explicit diff preview + `Accept` / `Reject` approval.
- **Model Picker vs Provider Settings (`ModelSwitcherModal.tsx`):** Separated quick model selection (`Select model`: search, model name, provider name, honest availability badge, selected indicator) from `Provider settings` (API key management, `Test connection`, `Refresh models`, and progressive disclosure for custom OpenAI-compatible endpoints).
- **Centralized Settings (`SettingsDialog.tsx`):** Categorized `Dialog` (`General`, `Appearance`, `Editor`, `Terminal`, `AI providers`, `Accounts`, `Keyboard shortcuts`, `About`) backed by persisted `editorSettings` and `appTheme` (`obsidian` / `light` preview).
- **Light Theme Status:** Global `appTheme` persists via `localStorage` and toggles `html.light` / `html.dark` without remounting; labeled as **Preview** until Phase F migrates Terminal, Source Control, and Problems.

---

## 11. Phase E Intelligence Visualization & Metric Honesty Standards

- **Theme-Aware SVG Graphs (`KnowledgeGraphCanvas.tsx`):** SVG nodes, edges, grid lines, and arrow markers must consume `rgb(var(--ide-*))` CSS variables rather than hardcoded hex colors so both Obsidian Dark and Light themes render cleanly.
- **Node & Edge Discipline:** Nodes use `6px` corners (`rx="6"`), neutral `ide-panel` backgrounds, semantic marker accents, and `Inter` labels; relationship labels appear contextually on focus/impact/hover.
- **Contextual Details:** Graph details live in a collapsible, `ResizablePanel` (`320px` default) with `Open file`, `Focus node`, `Call hierarchy`, and `Impact` actions.
- **Metric Honesty:** Heuristic scores (`Impact analysis`) must be labeled as heuristic estimates; simulated tools (`MCP Hub`, `Validation`, `Evaluation benchmarks`) must carry explicit `Experimental` / `Simulated` / `Illustrative` badges and never fabricate live telemetry.

---

## 12. Phase E.5 Workspace Interaction & Productivity Standards

- **Navigation History (`TopNav.tsx` + `IDEContext.tsx`):** Compact `Back` (`Alt+Left`) and `Forward` (`Alt+Right`) buttons in the top bar navigate deduplicated workspace history across Editor files and Knowledge Graph views without resetting graph state.
- **Persistent Graph Session (`GraphSessionState`):** Knowledge Graph expansion, selection, focus/scope, filter, search, manual node positions, and React Flow viewport `{ x, y, zoom }` are stored in `IDEContext` (scoped by `workspacePath`) so switching between Graph and Editor preserves exact layout and zoom.
- **Unified Graph Guide (`GraphGuideDialog.tsx`):** Accessed from the Knowledge Graph toolbar `Guide` button or Command Palette (`Knowledge Graph: Open Graph Guide`), using shared `Dialog` + `Tabs` (`Relationships`, `Node types`, `Interactions`) and live `--graph-*` CSS tokens.
- **Global Workspace DnD (`App.tsx`):** Dragging a workspace file over non-editor views reveals a contextual `Open in Editor` banner drop zone (`data-testid="global-editor-drop-zone"`) alongside view-specific drop targets (such as Knowledge Graph relationship focus).
- **Editor Tab Management (`CodeEditor.tsx`):** Supports pinning tabs (`Pin` / `Unpin`), right-click tab context menu, and a compact three-dot overflow menu (`Close`, `Close others`, `Close to the right`, `Close saved`, `Close all unpinned`, `Reopen closed`).

---

## 10. Approved & Prohibited Patterns

### Approved
- Semantic `ide-*` Tailwind tokens (`bg-ide-bg`, `bg-ide-shell`, `bg-ide-panel`, `border-ide-border`, `text-ide-text`, `text-ide-muted`).
- Shared UI primitives from `src/components/ui/`.
- Flat surfaces, crisp `1px` borders, subtle `hover`/`selected` states, progressive disclosure.
- Panel-level `PanelErrorBoundary` wrapping independent panes.

### Prohibited
- Raw hex colors (`#...`) or Tailwind palette classes (`bg-slate-*`, `text-cyan-*`, `bg-blue-*`, `text-emerald-*`, etc.) in components.
- `font-mono` on headings, paragraphs, buttons, or navigation tabs.
- Decorative gradients, neon shadows, glowing borders, or pulsing marketing badges.
- Fabricated metrics, mock success states, or fake confidence/token-saving numbers.
- Conditional React hooks or early `return null` before hooks.

---

## 11. Component Contribution & Review Checklist

Before merging any UI change:
- [ ] Uses only semantic `ide-*` tokens (zero raw hex or `slate-*`/`cyan-*`/`blue-*` classes).
- [ ] Follows `Inter` (UI) vs `JetBrains Mono` (code/terminal/paths only) rules.
- [ ] Adheres to the 4px spacing scale, target heights (`44px` top bar, `36px` tabs, `32px` buttons, `28px` tree rows, `24px` status bar), and radius rules.
- [ ] All icon-only buttons have `title` and `aria-label`.
- [ ] Keyboard focus (`ide-focus-ring`) and `Escape` handling verified.
- [ ] Tested at `1280×720`, `1440×900`, and `1920×1080`.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass with 0 errors.

---

## 12. Phase E.1 — IntelliCode Porcelain Light Theme, Syntax Tokens & Knowledge Graph Architecture

### IntelliCode Porcelain (Light Theme)
Porcelain replaces flat `#FFFFFF` surfaces with warm, eye-friendly neutral separation:
- Workspace / Editor (`--ide-bg`, `--ide-code`): `#F7F7F5` (`247 247 245`)
- Application Chrome (`--ide-shell`): `#E7E9ED` (`231 233 237`)
- Activity Bar (`--ide-activitybar`): `#E3E5E9` (`227 229 233`)
- Explorer & Sidebars (`--ide-sidebar`): `#EDEEF1` (`237 238 241`)
- Elevated Panels & Cards (`--ide-panel`, `--ide-card`): `#FAFAFB` (`250 250 251`)
- Hover (`--ide-hover`): `#E1E4EA` · Selected (`--ide-selected`): `#DCE5F4`
- Borders: Subtle `#CDD1D6` · Strong `#B6BCC4`
- Text: Primary `#24272E` · Secondary `#525B68` · Muted `#646C79`
- Primary Accent (`--ide-focus`): `#3765C5`

### Theme-Aware Syntax Highlighting (`--syntax-*`)
Both Obsidian (dark) and Porcelain (light) define `--syntax-keyword`, `--syntax-function`, `--syntax-string`, `--syntax-number`, `--syntax-comment`, `--syntax-type`, `--syntax-tag`, `--syntax-variable`, and `--syntax-operator` with >= 4.5:1 WCAG AA contrast against `--ide-code`.

### Knowledge Graph Exploration Architecture
- **Progressive Exploration Modes**: `Overview` (folder/module groups with real file & symbol counts + aggregated edges), `Files` (file dependency graph), `Symbols` (symbol & call graph), and `Focus` (concentric radial neighborhood with adjustable depth `1–3`).
- **Deterministic Layout Engine (`src/utils/graphLayout.ts`)**: Cycle-safe topological layered layout with barycenter crossing minimization + radial focus layout, keeping O(V + E) responsiveness even on 500+ node graphs without continuous simulation overhead.
- **Edge & Label Discipline**: Subtle default edge opacity (`0.42`), hover/selection highlight (`0.96`), middle-truncated readable labels with full `title` tooltips, keyboard navigation (`Arrow` keys, `Enter`, `Escape`), and a compact minimap for graphs with >18 visible nodes.

---

## 13. IntelliCode Progressive Graph Explorer — Interaction Standards

- **Persistent Parent Hierarchy**: Expanding a folder or module group keeps the parent group card visible in place, updates its folder icon and chevron state, and renders revealed children beside it connected by `CONTAINS` hierarchy edges. Collapsing hides descendants while preserving the parent.
- **Selection vs. Expansion**: Single-clicking a node body selects it; clicking the expansion chevron (or double-clicking an expandable group) toggles expansion; double-clicking a file or symbol navigates to source; clicking empty canvas or pressing `Escape` clears selection without collapsing expanded groups.
- **Stable Node Identity**: Group IDs (`group:<folderKey>`) and workspace node IDs derive from normalized workspace paths and symbol identities, keeping duplicate filenames in separate directories distinct.
- **Multiple Simultaneous Expansions**: Multiple groups and files can remain expanded at the same time; collapsing or selecting one group never collapses unrelated groups.
- **Connected Expansion & Spatial Stability**: Revealed children are placed directionally beside their parent without overlapping sibling groups, preserving unaffected node positions as well as pan and zoom during expansion.
- **Dedicated Subgraphs**: Groups support explicit scoped exploration (`Explore group`) with a breadcrumb header (`Overview / <group>`) and `Overview` return navigation that preserves prior overview expansion state.
- **Node Interaction States**: Default (`--ide-panel` / `--ide-border`), Hovered (`--ide-hover` / `--ide-border-strong`), Selected (`2px` `--ide-focus` border + `--ide-selected` tint), Expanded (`FolderOpen` + `ChevronDown`), Related (subtle accent border emphasis), and Focus-dimmed (`0.52` opacity only during intentional Focus mode).
- **Relationship Semantics**: Visually distinguish `Contains` (dashed hierarchy connector, non-dependency), `Defines` (dotted purple connector), `Imports` (directed dependency arrow), and `Calls` (directed call arrow). Containment edges never alter Change Impact Analysis.
- **Motion & Accessibility**: Meaningful position transitions animate over `180–200ms` and honor `prefers-reduced-motion`; all nodes and expansion chevrons are keyboard-accessible (`Tab`, `Enter`, `Space`, `Arrow` keys, `Escape`).
- **Theme Compatibility & Large-Graph Handling**: All graph surfaces, edges, and badges use semantic `--ide-*` and `--graph-*` visualization tokens (`--graph-module`, `--graph-file`, `--graph-function`, `--graph-class`, `--graph-interface`, `--graph-test`, `--graph-package`, `--graph-route`) across Obsidian Dark and Porcelain Light, rendered with `@xyflow/react` + `elkjs` layered layout. Large groups reveal children incrementally (`Show more`) rather than silently discarding nodes.
- **Interactive Inspection & Cross-Panel Workflows**:
  - **Node Hover Previews**: Viewport-aware preview cards appear after a `360ms` delay showing full name, path, entity type, incoming/outgoing counts, and defined symbol counts.
  - **Edge Aggregation & Inspection**: Multi-edges between the same directional pair (`A -> B`) display human-readable summaries (e.g. `1 import · 2 calls`, `4 relationships`) instead of generic `refs`. Clicking an edge selects it and opens the Relationship Inspector with categorized underlying edges, actual source file/line evidence, and `Go to source` navigation.
  - **Cross-Panel Drag-and-Drop**: Explorer items and graph entities serialize workspace-scoped payloads (`application/x-intellicode-entity`) supporting Explorer-to-Editor opening, Explorer-to-Graph reveal, and Explorer/Graph-to-AI Assistant context attachment (never auto-submitting or modifying files on disk).
