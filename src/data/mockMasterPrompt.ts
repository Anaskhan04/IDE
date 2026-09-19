export interface MasterPromptData {
  projectName: string;
  version: string;
  astVersion: string;
  lastSynced: string;
  requirements: string;
  architecture: string;
  invariants: string[];
  goals: string[];
  activeTokensCount: number;
  tokensSavedTotal: number;
  cacheHitRatio: string;
}

export const INITIAL_MASTER_PROMPT: MasterPromptData = {
  projectName: 'NovaStore E-Commerce Engine',
  version: '2.4.1-alpha',
  astVersion: 'AST-SHA-89f42c',
  lastSynced: 'Just now (Continuous watcher)',
  requirements: `Build a resilient, high-throughput micro-service checkout system with strict type safety, zero token-waste model switching, automated change impact isolation, and unified MCP gateway integration.`,
  architecture: `Layered architecture:
1. Core Services Layer: paymentService.ts, authService.ts, orderService.ts
2. State & Store Layer: cartStore.ts, sessionManager.ts
3. Client UI Layer: CheckoutPage.tsx, LoginPage.tsx
4. Testing Layer: Unit & E2E regression suites
5. Integration Layer: MCP Servers (GitHub, PostgreSQL, Browser, Slack)`,
  invariants: [
    'All monetary calculations must be strictly typed with currency validation.',
    'Any modification to paymentService.ts requires re-validation of CheckoutPage and cartStore.',
    'All token authentication secrets must be accessed via centralized MCP Vault.',
    'Model switching must NEVER trigger whole-codebase re-indexing.'
  ],
  goals: [
    'Sub-second model context handover between Claude, GPT, and Gemini.',
    '100% blast radius capture for breaking API modifications.',
    'Zero credential leakage via centralized MCP sandbox.'
  ],
  activeTokensCount: 14820,
  tokensSavedTotal: 184500,
  cacheHitRatio: '96.8%'
};
