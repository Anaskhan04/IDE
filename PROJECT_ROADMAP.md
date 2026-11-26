# IntelliCode Project Roadmap

## Semester 7 Achievements (Completed & Stabilized)

### 1. Design System 2.0 & Professional IDE Shell
- **Obsidian & Porcelain Themes:** Semantic CSS token architecture (`src/styles/tokens.css`, `tailwind.config.js`, `DESIGN_SYSTEM.md`) enforced by `scripts/check-design-system.mjs` with zero legacy debt.
- **Shared UI Primitives (`src/components/ui/`):** Accessible `Button`, `IconButton`, `Dialog` (focus-trapping), `Tabs`, `Select`, `Menu`, `ResizablePanel`, `Badge`, and `PanelErrorBoundary`.
- **Workspace Navigation & Tab Management:** `Back`/`Forward` (`Alt+Left`/`Alt+Right`) navigation history, Explorer-to-Editor switching, global drag-and-drop `Open in Editor` banner, tab pinning, bulk close actions, and `Reopen closed`.

### 2. Semantic Knowledge Graph & Code Intelligence
- **TypeScript Compiler AST Engine (`src/utils/astParser.ts`):** Real extraction of files, functions, classes, interfaces, types, imports (including barrel re-exports and `tsconfig` path aliases), semantic function calls, and test references.
- **Interactive Progressive Graph (`@xyflow/react` + `elkjs`):** `Overview`, `Files`, `Symbols`, `Focus` (depth `1–3`), and `Scoped` views with persistent parent groups, directional multi-edge aggregation, source-line evidence inspector, hover previews, context menus, unified **Knowledge Graph Guide**, and persistent `GraphSessionState` across view switches.
- **Change Impact Analysis & Graph Queries:** Cycle-safe heuristic impact traversal, Cypher-style `MATCH ... WHERE ... RETURN ...` pattern queries, and BFS Call Path Tracer.

### 3. Graph-Aware AI Assistant, Source Control & Terminal
- **AI Gateway & Context Builder:** Relevance-ranked context (`src/utils/aiContextBuilder.ts`) combining active file, graph dependencies, diagnostics, and CIA results with secret/.env exclusion, multi-provider configuration, and diff approval.
- **Real Git, GitHub & Terminal (`vite-plugin-git.js`):** Real Git status/stage/commit/branch/diff/push/pull, GitHub OAuth/CLI/PAT authentication, and OS shell terminal execution.
- **Deterministic Demo Fixture:** `demo/task-management-system` showcasing real TypeScript/React dependencies, calls, tests, CIA, and AI context attachment.

### 4. Simulated / Experimental Components in Semester 7
- **MCP Hub**, **Validation Runner**, **Prompt Analyzer**, and **Benchmark Dashboard** are prototype/illustrative interfaces in Semester 7 and are explicitly labeled as simulated/experimental rather than live execution telemetry.

---

## Semester 8 Objectives (Planned)

1. **Persistent Indexing & Language Server Integration:**
   - Add a local SQLite/LMDB symbol index for large repositories with incremental file-watcher updates.
   - Connect workspace-backed `tsserver` / LSP for full `node_modules` `@types/*` resolution and cross-package type checking.
2. **Live MCP, Validation & Benchmark Execution:**
   - Replace simulated MCP Hub, Validation Runner, and Benchmark Dashboard data with live MCP server connections, real project test-suite execution, and reproducible AI evaluation runs.
3. **Multi-Language Deep Analysis:**
   - Upgrade Python, C, HTML, and CSS diagnostics and call-graph resolution beyond structural/regex checks.
4. **Full Porcelain Light Theme & Desktop Packaging:**
   - Complete Light theme parity across all secondary views and evaluate Electron/Tauri desktop packaging.
