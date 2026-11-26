# IntelliCode Intelligence Architecture

## 1. Unified Graph Data Model

IntelliCode separates **structural**, **declaration**, **semantic**, and **project** relationships across `src/types/ide.ts`, `src/utils/astParser.ts`, and `src/utils/graphLayout.ts`:

- **Structural (`CONTAINS`)**: Folder/module containment generated purely in the visualization projection (`buildArchitectureOverview`). Never injected into `graphEdges` or Change Impact Analysis.
- **Declaration (`DEFINES`, `EXPORTS`)**: File-to-symbol declarations (`Function`, `Class`, `Interface`, `Type`) with 1-based line numbers and export flags.
- **Semantic (`IMPORTS`, `CALLS`, `EXTENDS`, `IMPLEMENTS`, `RENDERS`, `TYPE_REFERENCE`, `REFERENCES`)**:
  - Every resolved edge carries `sourceFilePath`, `sourceLine`, `resolutionStatus` (`'direct' | 'semantic' | 'inferred' | 'unresolved'`), and `evidence`.
- **Project (`TEST_REFERENCE`, `PACKAGE_DEPENDENCY`)**: Test-to-source references detected from `.test.` / `.spec.` files.

## 2. Extraction & Semantic Resolution (`src/utils/astParser.ts`)

- **JavaScript / TypeScript / JSX / TSX**: Parsed with the TypeScript Compiler AST (`ts.createSourceFile`).
- **Module Resolution (`resolveImportPath`)**: Resolves relative paths (`./`, `../`), directory `index.*` files, extensionless imports, root-relative web paths, and `tsconfig.json` `compilerOptions.paths` aliases.
- **Semantic Call & Reference Resolution (`resolveSemanticSymbol`)**:
  1. **Namespace imports** (`import * as ns from './mod'; ns.fn()`).
  2. **Local declarations** in the same file (`resolutionStatus: 'direct'`).
  3. **Named, default, and aliased imports** (`import { a as b } from './mod'`) followed through barrel re-exports (`export { a } from './real'`, `export * from './real'`) with cycle protection (`resolutionStatus: 'semantic'`).
  - **No blind name matching:** Two functions with the same name in different modules do not cross-wire. Dynamic bracket calls (`handlers[key]()`) are not fabricated as static `CALLS` edges.
- **HTML / CSS / C / Python**: Dedicated HTML `<link>`/`<script>`/`<style>` + inline `<script>` parser, CSS `@import` parser, and regex fallback for C/Python.

## 3. Visualization Architecture (`@xyflow/react` + `elkjs`)

- **Authoritative Data**: `IDEContext` owns `graphNodes`, `graphEdges`, and enriched `files`.
- **Projection (`graphLayout.ts`)**: Projects `Overview` (persistent parent groups + connected children), `Files`, `Symbols`, `Focus` (depth `1–3`), and `Scoped` subgraphs without mutating `graphEdges`. Directional multi-edges (`A -> B`) are grouped for visual clarity with `countsByType` and `underlyingEdges` preserved in full (opposite directions `B -> A` never merge).
- **Layout (`elkGraphLayout.ts`)**: Runs `elkjs` `elk.layered` (`RIGHT` flow, `LAYER_SWEEP` crossing minimization, `ORTHOGONAL` routing, `BRANDES_KOEPF` node placement) with stale-request cancellation and synchronous fallback.
- **Rendering & Inspection (`ProgressiveGraphCanvas.tsx`, `SemanticGraphNode.tsx`, `SemanticGraphEdge.tsx`)**: Read-only architecture explorer with semantic `--graph-*` tokens, `360ms`-debounced node hover previews, edge hover tooltips, clickable Edge Relationship Inspector with real source snippets & line navigation, context menus, and workspace-validated cross-panel drag-and-drop (`workspaceDragDrop.ts`).

## 4. AI Context Integration (`src/utils/aiContextBuilder.ts`)

- `selectRelevantContext` consumes `graphNodes` and `graphEdges` (excluding `CONTAINS`), prioritizing `@file` attachments, the active editor file, outgoing graph dependencies (`IMPORTS`, `CALLS`, `EXTENDS`, `IMPLEMENTS`, `RENDERS`, `TYPE_REFERENCE`, `TEST_REFERENCE`), incoming dependents, diagnostics, and Change Impact Analysis, while redacting inline secrets and excluding `.env`/key files.

## 5. Known Accuracy Limitations & Future Indexing Roadmap

- **Browser Virtual FS:** `diagnosticsEngine.ts` runs TypeScript with `noLib: true` and relative-only `resolveModuleNames` because `node_modules` `@types/*` are not mounted in browser memory.
- **Dynamic Dispatch & Prototype Chains:** Polymorphic method calls (`obj.method()` on unannotated parameters) and computed bracket calls are intentionally left unresolved rather than guessed.
- **Future Persistent Indexing Roadmap:** Local SQLite/LMDB symbol index + workspace-backed TypeScript Language Server (`tsserver`) for full cross-package type checking and incremental file-watcher updates.
- **Session & Workspace Navigation (Phase E.5):** Graph exploration state (`GraphSessionState` in `src/utils/workspaceNavigation.ts`) is persisted in `IDEContext` across view transitions and reset cleanly on `workspacePath` changes; `Back`/`Forward` navigation (`Alt+Left`/`Alt+Right`) restores prior Editor files or Graph focus targets seamlessly.
