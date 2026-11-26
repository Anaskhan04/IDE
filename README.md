# IntelliCode IDE

An intelligent, graph-aware web coding workspace combining a multi-tab code editor, TypeScript/multi-language diagnostics, an AST-powered semantic Knowledge Graph with Change Impact Analysis, real Git Source Control, GitHub authentication, an integrated terminal, and a multi-provider AI coding assistant.

---

## Problem Statement

Modern software codebases grow across dozens of files, modules, and layers, making it difficult for developers—and AI coding assistants—to understand cross-file dependencies, trace function call chains, and estimate the downstream impact of edits without leaving their editor. Traditional editors treat files as isolated text buffers, while AI chat tools often rely on naive keyword search or manual copy-pasting that misses structural dependencies.

## Objectives

1. **Unified Code & Architecture Workspace:** Combine file editing, Explorer navigation, Source Control, Terminal, and interactive architectural exploration in one cohesive IDE.
2. **Semantic Code Intelligence:** Extract real AST declarations, imports, function calls, type references, and test links using the TypeScript Compiler API (`typescript`) without fabricating blind name matches.
3. **Interactive Knowledge Graph & Impact Analysis:** Provide progressive, spatially stable graph exploration (`Overview`, `Files`, `Symbols`, `Focus`, `Scoped` modes) with source-line evidence and cycle-safe Change Impact Analysis.
4. **Graph-Aware AI Context:** Rank and attach relevant dependencies, callers, diagnostics, and impact signals to AI prompts while redacting secrets and protecting sensitive files.

---

## Architecture

IntelliCode uses a local-first React + Vite frontend paired with a loopback-bound Node.js Vite middleware (`vite-plugin-git.js`):

- **Frontend Shell (`src/App.tsx`, `src/context/IDEContext.tsx`):** Centralized workspace state, `GraphSessionState` persistence, `Back`/`Forward` navigation history, Design System 2.0 (`IntelliCode Obsidian` dark & `IntelliCode Porcelain` light preview), and resizable panels.
- **Code Intelligence (`src/utils/astParser.ts`, `src/utils/diagnosticsEngine.ts`):** TypeScript Compiler AST parser (`ts.createSourceFile`) with `tsconfig.json` path alias and barrel re-export resolution, plus HTML/CSS/JSON/Python structural checks.
- **Knowledge Graph Engine (`src/utils/graphLayout.ts`, `src/utils/elkGraphLayout.ts`, `src/components/knowledge-graph/`):** `@xyflow/react` + `elkjs` (`elk.layered`) progressive explorer with directional edge aggregation, source-evidence inspector, hover previews, context menus, and cross-panel drag-and-drop.
- **AI Gateway & Context (`src/utils/aiContextBuilder.ts`, `src/utils/aiService.ts`):** Graph-ranked context builder (`CONTAINS` excluded) with multi-provider adapters and backend-proxied API key handling.
- **Local Backend Middleware (`vite-plugin-git.js`):** Strictly bound to `127.0.0.1:3000` for real Git CLI operations, OS shell terminal execution, GitHub OAuth Device Flow / CLI / PAT authentication, and AI provider proxying.

---

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Knowledge Graph & Layout:** React Flow (`@xyflow/react`), ELK (`elkjs`)
- **Code Intelligence:** TypeScript Compiler API (`typescript`), custom AST/graph traversal
- **Backend Middleware:** Node.js Vite middleware (`vite-plugin-git.js`)
- **Testing & Quality:** Node Test Runner (`tsx --test`), Playwright (`@playwright/test`), ESLint, Design System check script (`scripts/check-design-system.mjs`)

---

## Installation & Running Locally

### Prerequisites
- Node.js 18+
- Git installed and available on `PATH`
- (Optional) GitHub CLI (`gh`) for automatic GitHub session detection
- (Optional) Ollama running locally on `http://127.0.0.1:11434/v1` for local models

### Install, Verify & Run
```bash
npm install
npm run lint
npm run lint:design
npm test
npm run build
npm run dev
```

The development server binds strictly to `127.0.0.1:3000`.

To try the Semester 7 demonstration project, click **Open folder** in Explorer and select `demo/task-management-system` (see `demo/task-management-system/README.md` for the walkthrough).

---

## Implemented Features (Semester 7)

- **Code Editor & Explorer:** Multi-tab editor with dirty-state tracking, tab pinning, bulk close (`Close others`, `Close to the right`, `Close saved`, `Close all unpinned`), `Reopen closed`, Disk Sync, Global Search (`Ctrl+K` / `Ctrl+Shift+F`), and Go-to-Line navigation.
- **Knowledge Graph & Change Impact Analysis:**
  - Progressive exploration (`Overview`, `Files`, `Symbols`, `Focus` depth `1–3`, `Scoped` module view) with persistent parent group nodes.
  - Directional multi-edge aggregation (`IMPORTS`, `CALLS`, `DEFINES`, `REFERENCES`, `TEST_REFERENCE`) with source-line evidence, hover previews, right-click context menus, unified **Knowledge Graph Guide** dialog, and Cypher-style pattern queries + BFS Call Tracer.
  - Persistent `GraphSessionState` (expanded groups/files, selection, filters, viewport zoom/pan) across Editor ↔ Graph switches and `Back`/`Forward` (`Alt+Left`/`Alt+Right`) navigation.
  - Heuristic Change Impact Analysis with cycle-safe traversal.
- **AI Assistant & Model Gateway:**
  - Multi-provider configuration (Google Gemini, Anthropic Claude, OpenAI, Ollama, custom OpenAI-compatible endpoints) with connection testing, model discovery, and diff approval before applying edits.
  - Graph-aware `Project context` builder with `@file` attachments, Explorer/Graph drag-and-drop, and secret/.env exclusion.
- **Source Control, GitHub & Terminal:**
  - Real Git status, stage/unstage, diff modal, commit, branch management, fetch/pull/push, and GitHub authentication (OAuth Device Flow, `gh` CLI, PAT).
  - Integrated OS terminal bound to the active workspace directory.
- **Simulated / Experimental Tools (Explicitly Labeled):**
  - **MCP Hub**, **Validation Runner**, **Prompt Analyzer**, and **Benchmark Dashboard** are currently simulated/illustrative interfaces for workflow demonstration and are labeled accordingly in the UI.

---

## Known Limitations

- **Browser Virtual FS Diagnostics:** `diagnosticsEngine.ts` runs TypeScript with `noLib: true` and relative-only module resolution because `node_modules` `@types/*` are not mounted in browser memory.
- **Dynamic Dispatch:** Polymorphic method calls on unannotated parameters and computed bracket calls are intentionally left unresolved rather than guessed.
- **Non-TS Languages:** Python, C, CSS, and HTML checks are structural/syntax-level rather than full language-server analysis.
- **Simulated Tooling Views:** MCP Hub, Validation Runner, and Benchmark Dashboard use simulated/illustrative data in Semester 7.
- **Light Theme Preview:** `IntelliCode Porcelain` light theme is available as a preview in Settings.

---

## Semester 8 Development Roadmap

See [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) for the full breakdown:
- Persistent SQLite/LMDB symbol index and workspace-backed TypeScript Language Server (`tsserver`) integration.
- Live MCP server execution, real test-runner integration in Validation Runner, and reproducible AI evaluation benchmarks.
- Multi-language LSP support (Python/C/HTML/CSS) and complete Light theme parity across all secondary panels.

---

## Security Notes

- The Vite backend binds strictly to `127.0.0.1` and validates local/same-origin requests.
- Workspace file operations enforce `realpath` symlink-escape protection.
- Sensitive files (`.env`, `.git`, `.pem`, `.key`, credentials) are excluded from AI context and generation targets.
- AI provider URLs validate against private/loopback SSRF targets (allowing `127.0.0.1` / `localhost` only for local Ollama).
