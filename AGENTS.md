# AI Agent Instructions

When acting as an AI coding agent modifying the UI of this project, you **MUST strictly follow** the established design system documented in `DESIGN_SYSTEM.md`.

## CRITICAL RULES FOR AI AGENTS

1. **Always read `AGENTS.md` and `DESIGN_SYSTEM.md` before modifying UI.** You must be fully aware of the established tokens and patterns before making any changes.
2. **Existing design system has priority over AI-generated styling.** Do not randomly change the existing visual language or invent new UI patterns that conflict with the current aesthetic.
3. **Reuse existing components and tokens whenever possible.** Inspect existing components before creating new ones. If you need a dropdown, button, or modal, find an existing one in the codebase and copy its structure.
4. **Do not introduce new fonts, colors, spacing, shadows, radius, or typography without checking the design system first.** You must use the existing Tailwind CSS tokens (e.g., `bg-ide-bg`, `text-ide-text-muted`, `border-ide-border`). Do not use raw hex codes or unapproved Tailwind colors unless replicating a specific, existing exception.
5. **Keep the design system and implementation synchronized.** If a genuinely new design token or pattern is required and approved, you **MUST** update `DESIGN_SYSTEM.md` and `src/styles/tokens.css` as part of the same change.
6. **Run the build after UI changes.** Always verify your changes by running `npm run build` to ensure the CSS compiles correctly and no Tailwind/PostCSS errors were introduced.

### Component Guidelines:
- **Surfaces:** Use `bg-ide-bg` for the main background, `bg-ide-surface` for slightly elevated secondary areas, and `bg-ide-panel` for floating elements like modals or tooltips.
- **Borders:** Use `border-ide-border` for generic separation. Use `border-ide-border-strong` where distinction is strictly necessary.
- **Typography:** Stick to the existing sans-serif and monospace stacks. Rely on `.ide-text-title`, `.ide-text-body`, or `.ide-text-meta`.
- **Focus states:** Ensure interactive elements are keyboard accessible by using the existing focus ring patterns (e.g., `.ide-focus-ring` or `focus:outline-ide-focus`).

By following these instructions, you ensure the repository is self-contained and visually cohesive.
