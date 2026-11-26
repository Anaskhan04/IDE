# Changelog

## Semester 7 Release (Baseline)

### Implemented
- **Design System 2.0 & IDE Shell:**
  - Introduced `IntelliCode Obsidian` (dark) and `IntelliCode Porcelain` (light preview) semantic token systems (`src/styles/tokens.css`, `tailwind.config.js`, `DESIGN_SYSTEM.md`), enforced via `scripts/check-design-system.mjs`.
  - Built shared accessible UI primitives (`Button`, `IconButton`, `Dialog`, `Tabs`, `Select`, `Menu`, `ResizablePanel`, `Badge`, `PanelErrorBoundary`).
  - Added workspace `Back`/`Forward` (`Alt+Left`/`Alt+Right`) navigation history, Explorer-to-Editor file opening, and a global `Open in Editor` drag-and-drop banner.
- **Code Editor & Tab Management:**
  - Multi-tab editor with syntax highlighting, dirty-state tracking, Disk Sync, cursor/scroll preservation, tab pinning, right-click context menu, overflow actions (`Close`, `Close others`, `Close to the right`, `Close saved`, `Close all unpinned`, `Reopen closed`), Global Search (`Ctrl+K`), and Go-to-Line navigation.
- **Semantic Knowledge Graph & Code Intelligence:**
  - TypeScript Compiler AST parser (`src/utils/astParser.ts`) extracting declarations, imports (with barrel re-export and `tsconfig` path alias resolution), semantic function calls, type references, and test links.
  - Progressive React Flow + ELK (`elkjs`) graph explorer (`Overview`, `Files`, `Symbols`, `Focus` depth `1–3`, `Scoped`) with persistent parent group nodes, directional multi-edge aggregation, Edge Relationship Inspector with real source snippets, hover previews, context menus, unified **Knowledge Graph Guide**, Cypher-style pattern queries, and BFS Call Path Tracer.
  - Persistent `GraphSessionState` preserving expansion, selection, filters, manual node positions, and viewport across Editor ↔ Graph transitions.
  - Heuristic cycle-safe Change Impact Analysis.
- **Graph-Aware AI Assistant & Model Gateway:**
  - Relevance-ranked `Project context` builder (`src/utils/aiContextBuilder.ts`) combining AST, Knowledge Graph, diagnostics, and CIA results with `.env`/secret exclusion.
  - Multi-provider configuration for Google Gemini, Anthropic Claude, OpenAI, Ollama, and custom OpenAI-compatible endpoints with diff approval before applying edits.
- **Source Control, GitHub & Integrated Terminal:**
  - Real Git CLI operations, diff viewer, GitHub authentication (OAuth Device Flow, `gh` CLI, PAT), and OS shell terminal bound to the active workspace (`vite-plugin-git.js`).
- **Demonstration Fixture & Automated Verification:**
  - Added `demo/task-management-system/` fixture and automated verification (unit tests + Playwright browser regression suite).

### Experimental / Simulated
- **MCP Hub**, **Validation Runner**, **Prompt Analyzer**, and **Benchmark Dashboard** are prototype/illustrative interfaces in Semester 7 and are explicitly labeled as simulated/experimental in the UI.

### Planned (Semester 8)
- Persistent SQLite/LMDB symbol indexing and workspace-backed `tsserver` / LSP integration.
- Live MCP server execution, real test-runner integration in Validation Runner, and reproducible AI evaluation benchmarks.
- Deeper multi-language LSP diagnostics (Python, C, HTML, CSS) and full Porcelain Light theme parity.
