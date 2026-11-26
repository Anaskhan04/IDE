# Contributing to IntelliCode

Thank you for contributing to IntelliCode! Please follow the branching, design system, and verification standards below.

## Branching Strategy

- **`main`**: Stable release branch. Direct pushes should be avoided; changes land via reviewed pull requests.
- **`anas-working`**: Active feature/stabilization branch for Anas's workstreams.
- **`nitin-working`**: Active feature/stabilization branch for Nitin's workstreams.

Create short-lived topic branches from your working branch when needed, and keep PRs focused on a single concern.

## Development Setup

### Prerequisites
- Node.js 18+ (Node 20 LTS recommended)
- Git available on `PATH`

### Local Setup
```bash
npm install
npm run dev
```
The local Vite server and backend middleware bind strictly to `127.0.0.1:3000`.

## Commit Conventions

Use clear, imperative commit messages with an optional scope prefix:
- `feat(graph): ...` — new user-facing capability
- `fix(editor): ...` — bug fix or regression resolution
- `docs(readme): ...` — documentation updates
- `chore(repo): ...` — repository hygiene, CI, or dependency maintenance
- `test(e2e): ...` — unit or Playwright test additions

## Design System Compliance

All UI changes **must** follow [AGENTS.md](./AGENTS.md) and [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md):
- Use semantic `ide-*` and `--graph-*` tokens only (no raw hex codes or unapproved Tailwind palette classes).
- Reuse shared UI primitives in `src/components/ui/`.
- Use `Inter` (`font-sans`) for UI copy and `JetBrains Mono` (`font-mono`) strictly for code, file paths, terminal output, keybindings, and numeric coordinates.
- Ensure keyboard focus (`.ide-focus-ring`), `aria-label` + `title` on icon-only buttons, and Light/Dark theme parity.

## Testing & Verification Requirements

Before opening or merging a pull request, run:
```bash
npm run lint
npm run lint:design
npm test
npm run build
```
For UI, navigation, or Knowledge Graph changes, also run the local Playwright suite:
```bash
npm run test:e2e
```
Automated tests must never require live API keys or GitHub credentials.

## Code Review Workflow

1. Verify all lint, design-system, unit test, and build checks pass locally.
2. Confirm no secrets, `.env` files, or generated artifacts (`dist/`, `test-results/`) are staged.
3. Request review from a collaborator before merging into `main`.
