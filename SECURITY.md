# Security Policy

## Local-First Architecture

IntelliCode is designed as a **local-first single-developer workspace**. It is not intended for multi-tenant hosting or exposure to untrusted networks.

## Localhost Backend Restrictions

- The Vite development/preview middleware (`vite-plugin-git.js`) binds strictly to `127.0.0.1:3000`.
- Backend endpoints validate local/same-origin requests before executing Git, GitHub, terminal, or AI proxy actions.
- Workspace file operations validate target paths with `realpath` symlink-escape protection to prevent directory traversal outside the active workspace root.

## API Key Handling

- AI provider API keys are stored in backend session memory by default and are never intentionally logged or returned to untrusted origins.
- Error messages are sanitized to redact API keys and tokens.
- Provider endpoint URLs are validated to block unsafe protocols (`file:`) and private/loopback SSRF targets, explicitly permitting `127.0.0.1` / `localhost` only for local Ollama instances.
- Sensitive workspace files (`.env`, `.git`, `.pem`, `.key`, credentials) are excluded from AI context bundles and AI-generated file targets.

## GitHub Credential Handling

- GitHub authentication supports OAuth Device Flow, local GitHub CLI (`gh`) sessions, or Personal Access Tokens (PAT).
- Authenticated tokens are held in backend session memory by default (`persistToDisk = false`) unless explicitly persisted by user choice.

## Known Security Limitations

- **Integrated Terminal:** Executes real shell commands as your local OS user within the active workspace directory. Only open trusted repositories.
- **Browser Virtual FS:** Client-side TypeScript diagnostics operate on in-memory workspace files with `noLib: true`.

## Reporting a Vulnerability

If you discover a security issue in IntelliCode, please do **not** open a public issue with exploit details or commit credentials to the repository. Contact the project maintainers privately via GitHub and rotate any exposed tokens or API keys immediately.
