# AI Agent Instructions

When acting as an AI coding agent modifying the UI of this project, you **MUST strictly follow** Design System 2.0 documented in `DESIGN_SYSTEM.md`.

## CRITICAL RULES FOR AI AGENTS

1. **Always read `AGENTS.md` and `DESIGN_SYSTEM.md` before modifying UI.** Follow the IntelliCode Obsidian tokens, typography scale, 4px spacing scale, layout dimensions, and UX writing rules.
2. **Existing design system has priority over AI-generated styling.** Do not invent new visual patterns, decorative gradients, neon glows, or heavy shadows.
3. **Reuse shared UI primitives in `src/components/ui/` whenever possible.** Before creating a new button, icon button, input, dialog, badge, tab, or empty state, inspect `src/components/ui/` and reuse the shared component.
4. **Never use raw hex codes or unapproved Tailwind palette classes** (`slate-*`, `cyan-*`, `blue-*`, `emerald-*`, `rose-*`, `amber-*`, `purple-*`). Always use semantic `ide-*` tokens (`bg-ide-bg`, `bg-ide-shell`, `bg-ide-panel`, `bg-ide-hover`, `bg-ide-selected`, `border-ide-border`, `text-ide-text`, `text-ide-muted`, `text-ide-subtle`, `text-ide-focus`, etc.).
5. **Typography discipline:** Use `font-sans` (`Inter`) for all UI navigation, headings, buttons, and descriptions. Reserve `font-mono` (`JetBrains Mono`) strictly for code, file paths, terminal output, keybindings, and numeric coordinates.
6. **Accessibility & React Hooks discipline:**
   - Every icon-only button must have both `title` and `aria-label`.
   - Every interactive element must use `.ide-focus-ring` or `:focus-visible` styling.
   - Use `--ide-on-accent` on accent buttons and `--ide-on-destructive` on destructive buttons; distinguish decorative dividers (`border-ide-border`) from essential control boundaries (`border-ide-border-strong`).
   - Dialogs must trap focus, restore focus on close, and guard unsaved forms from accidental dismissal.
   - Forms must use explicit `<label>` elements with `aria-invalid` and `aria-describedby` error links; resizers must support keyboard arrow keys; menus and tabs must support arrow-key navigation.
   - Never place React hooks (`useState`, `useEffect`, `useMemo`, `useRef`, etc.) after conditional returns. Wrap new panels in `PanelErrorBoundary`.
7. **Keep design documentation synchronized:** If a genuinely new semantic token or shared pattern is required and approved, update `DESIGN_SYSTEM.md`, `src/styles/tokens.css`, and `tailwind.config.js` in the same change.
8. **Progressive Graph Explorer rules:** Never replace or delete parent group nodes on expansion, keep selection independent from expansion, never dim unrelated graph nodes outside intentional Focus mode, and never inject visual `CONTAINS` edges into dependency/CIA calculations.
9. **Workspace Session & Tab Integrity rules:** Preserve `GraphSessionState` and viewport across Editor <-> Graph transitions, always switch `activeView` to `'editor'` when `openFile()` is called from Explorer or global DnD, and keep `pinnedFileIds` synchronized via `src/utils/editorTabState.ts`.
10. **Verify after UI changes:** Always run `npm run lint`, `npm run lint:design`, `npm test`, and `npm run build` after UI modifications.
