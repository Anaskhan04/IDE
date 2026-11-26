# Task Management System (Semester 7 Demo Fixture)

This self-contained TypeScript + React project is a deterministic demonstration fixture for **IntelliCode IDE**.

## How to Open in IntelliCode
1. Start IntelliCode (`npm run dev`).
2. Click **Open folder** in the Explorer (or Welcome view) and select `demo/task-management-system`.
3. IntelliCode automatically indexes the TypeScript AST, Knowledge Graph relationships, and diagnostics.

## Presentation Walkthrough
1. **File & Module Dependencies:** Open **Knowledge graph** (`Overview` mode) to see `src/components`, `src/services`, `src/utils`, `src/types`, and `src/tests` module groups and directional `IMPORTS` / `CALLS` / `TEST_REFERENCE` links.
2. **Function-Level Relationships:** Switch to **Symbols** mode to inspect `TaskBoard -> createTask -> validateTaskTitle` and `TaskCard -> isOverdueTask` call edges.
3. **Source Evidence Inspector:** Click any directional edge (e.g., `taskService.ts -> taskValidators.ts`) to view the exact `sourceFilePath:sourceLine` and code snippet, then click **Go to source** to jump to that line in the Editor.
4. **Graph Session Preservation & Navigation:** Switch between the Editor and Knowledge Graph or click **Back** (`Alt+Left`) / **Forward** (`Alt+Right`) to verify expanded groups, selection, and viewport zoom persist.
5. **Change Impact Analysis:** Right-click `validateTaskTitle` or `taskValidators.ts` -> **Analyze impact** (or open **Impact analysis**) to view downstream dependents (`taskService.ts`, `TaskCard.tsx`, `TaskBoard.tsx`, `taskService.test.ts`).
6. **Graph-Aware AI Context:** Right-click `taskService.ts` -> **Add to AI context** (or drag from Explorer to the AI Assistant) and expand **Project context** to inspect the ranked AST + Graph + CIA context bundle.
