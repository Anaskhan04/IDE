# IntelliCode IDE

An intelligent web-based coding workspace combining a multi-file code editor, live TypeScript/multi-language diagnostics, an AST-powered Knowledge Graph with Change Impact Analysis, real Git Source Control, GitHub authentication, an integrated terminal, and a multi-provider AI coding assistant.

---

## Key Features

- **Code Editor & File Explorer**
  - Multi-tab editor with dirty-state tracking, Disk Sync (File System Access API / local backend workspace), Global Search (`Ctrl+Shift+F`), and Go-to-Line navigation.
- **Diagnostics Engine**
  - Real semantic and syntactic diagnostics for **TypeScript / JavaScript** via the TypeScript Compiler API (cross-file imports, undefined identifiers, type mismatches).
  - Language-aware structural checks for **CSS**, **HTML**, **JSON**, and **Python** (with string/comment awareness).
  - Documented limitation: Python and CSS checks are structural/syntax-level rather than full Python/CSS language servers.
- **Knowledge Graph & Change Impact Analysis (CIA)**
  - Real workspace AST indexing (`src/utils/astParser.ts`) extracting files, functions, classes, methods, imports, and call relationships.
  - Interactive Knowledge Graph viewer, **Pattern Query Engine** (supports `MATCH ... WHERE ... RETURN ...` Cypher-style pattern queries over the live graph), **Call Path Tracer** (BFS inbound/outbound traversal), and **Change Impact Analysis** with cycle-safe traversal.
- **Integrated Terminal**
  - Local OS shell execution (PowerShell/cmd on Windows, bash/sh on macOS/Linux) bound to the active workspace directory with `cd` state tracking, exit codes, and output display.
- **Source Control & GitHub Integration**
  - Real Git status, staging/unstaging, discard, diff viewer, commit, branch creation/switching, commit history, fetch, pull, and push via backend Git endpoints.
  - GitHub authentication supporting **OAuth Device Flow**, existing **GitHub CLI (`gh`)** sessions, or **Personal Access Token (PAT)** (in-memory session storage by default).
- **AI Model Gateway & Coding Assistant**
  - Live integration with **Google Gemini**, **Anthropic Claude**, **OpenAI**, **Ollama**, and OpenAI-compatible endpoints (model discovery, connection testing, streaming/cancellation, error mapping).
  - Relevance-ranked workspace context builder using AST, Knowledge Graph, Diagnostics, and CIA results, with automatic exclusion of `.env`/key files and inline secret redaction.
  - Diff preview before applying AI-generated multi-file edits to the editor and disk.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Code Intelligence:** TypeScript Compiler API (`typescript`), custom AST/graph traversal
- **Backend Middleware (`vite-plugin-git.js`):** Node.js Vite dev/preview middleware for Git CLI, terminal execution, GitHub OAuth/API, and AI provider proxy
- **Testing:** Node.js Test Runner (`node --test` via `tsx`)

---

## Setup & Running Locally

### Prerequisites
- Node.js 18+
- Git installed and available on `PATH`
- (Optional) GitHub CLI (`gh`) for automatic GitHub session detection
- (Optional) Ollama running locally on `http://127.0.0.1:11434/v1` for local models

### Install & Run
```bash
npm install
npm test
npm run build
npm run dev
```

The development server binds strictly to `127.0.0.1:3000`.

---

## Configuration

- **GitHub OAuth Device Flow (optional):** Set `INTELLICODE_GITHUB_CLIENT_ID` (or `GITHUB_OAUTH_CLIENT_ID`) in your environment to enable one-click GitHub Device Flow login. Otherwise, you can sign in with an existing `gh` CLI session or a Personal Access Token.
- **AI Providers:** Configure API keys directly in the AI Gateway modal (stored in backend session memory by default) or via standard environment variables if configured. Never commit API keys or `.env` files.

---

## Security Notes

- The Vite backend binds to `127.0.0.1` only (`host: '127.0.0.1'`) and checks local/same-origin requests.
- Workspace file operations validate paths with `realpath` symlink-escape protection.
- Sensitive files (`.env`, `.git`, `.pem`, `.key`, credentials) are excluded from AI context and AI code generation targets.
- AI provider URLs are validated against private/loopback SSRF targets (with `127.0.0.1` / `localhost` explicitly allowed only for local Ollama).
- The Integrated Terminal executes real shell commands as your local OS user and is intended strictly for local development, not multi-tenant or untrusted hosting.
