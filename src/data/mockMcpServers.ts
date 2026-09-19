import { MCPServer } from '../types/ide';

export const INITIAL_MCP_SERVERS: MCPServer[] = [
  {
    id: 'mcp-codebase-memory',
    name: 'codebase-memory-mcp (DeusData)',
    description: 'Tree-Sitter AST & SQLite persistent knowledge graph engine with Cypher queries, Louvain clustering, BFS call tracing, and 99% token reduction.',
    icon: 'GitFork',
    status: 'connected',
    transport: 'stdio',
    toolsCount: 15,
    apiConfigured: true,
    isPrimaryEngine: true,
    tools: [
      { 
        name: 'query_cypher', 
        description: 'Execute sub-millisecond Cypher-like graph query against the AST Knowledge Graph (e.g. MATCH (f:Function)-[:CALLS]->(g) WHERE f.name = "processPayment" RETURN g.name)', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { query: 'MATCH (f:Function)-[:CALLS]->(g) WHERE f.name = "processPayment" RETURN f.name, g.name' } 
      },
      { 
        name: 'trace_path', 
        description: 'BFS traversal of inbound or outbound call chains with depth and type inference', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { function_name: 'processPayment', direction: 'inbound', max_depth: 3 } 
      },
      { 
        name: 'detect_changes', 
        description: 'Maps uncommitted git diffs to affected symbols with risk and blast radius classification', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { target_file: 'src/services/paymentService.ts', include_uncommitted: true } 
      },
      { 
        name: 'get_architecture', 
        description: 'Returns languages, packages, entry points, HTTP routes, boundaries, and Louvain community clusters', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { project: 'NovaStore' } 
      },
      { 
        name: 'search_graph', 
        description: 'Structural regex search with label filters, degree boundaries, and file scopes', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { name_pattern: '.*Payment.*', label: 'Function' } 
      },
      { 
        name: 'find_dead_code', 
        description: 'Full graph scan detecting unreferenced functions with zero callers, excluding entry points', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { threshold_degree: 0 } 
      },
      { 
        name: 'semantic_query', 
        description: '11-signal hybrid vector search powered by nomic-embed-code embeddings over AST nodes', 
        permission: 'read', 
        enabled: true, 
        sampleArgs: { query: 'charge credit card with validation' } 
      },
      { 
        name: 'index_repository', 
        description: 'Triggers RAM-first Tree-Sitter parsing across 162 languages into in-memory SQLite store', 
        permission: 'execute', 
        enabled: true, 
        sampleArgs: { fast_tier: true, path: '.' } 
      }
    ]
  },
  {
    id: 'mcp-github',
    name: 'GitHub MCP Server',
    description: 'Autonomous repository operations, pull request creation, branch checks, and commit history.',
    icon: 'Github',
    status: 'connected',
    transport: 'stdio',
    toolsCount: 6,
    apiConfigured: true,
    tools: [
      { name: 'create_or_update_pr', description: 'Creates or updates a GitHub PR with CIA diff summary', permission: 'write', enabled: true, sampleArgs: { title: 'feat: update payment pipeline', branch: 'feat/payment-cia' } },
      { name: 'read_issue_thread', description: 'Fetches issue comments and acceptance criteria', permission: 'read', enabled: true, sampleArgs: { issue_number: 142 } },
      { name: 'list_recent_commits', description: 'Returns git blame and commit tree for blast analysis', permission: 'read', enabled: true, sampleArgs: { path: 'src/services/paymentService.ts' } }
    ]
  },
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL Database MCP',
    description: 'Direct SQL schema introspection, read-only query sandbox, and migration validation.',
    icon: 'Database',
    status: 'connected',
    transport: 'stdio',
    toolsCount: 4,
    apiConfigured: true,
    tools: [
      { name: 'introspect_schema', description: 'Inspects foreign keys and table constraints for dependency graph', permission: 'read', enabled: true, sampleArgs: { schema: 'public' } },
      { name: 'execute_safe_query', description: 'Executes parameterized queries in a sandboxed transaction', permission: 'read', enabled: true, sampleArgs: { sql: 'SELECT * FROM orders LIMIT 5' } },
      { name: 'validate_migration_ddl', description: 'Verifies DDL compatibility before applying DB changes', permission: 'write', enabled: false, sampleArgs: { migration_name: 'add_payment_tokens' } }
    ]
  },
  {
    id: 'mcp-browser',
    name: 'Browser Automation MCP (Puppeteer)',
    description: 'Headless browser runner for automated visual validation and end-to-end checkout testing.',
    icon: 'Globe',
    status: 'connected',
    transport: 'stdio',
    toolsCount: 5,
    apiConfigured: true,
    tools: [
      { name: 'run_e2e_checkout_flow', description: 'Simulates browser checkout click sequence on staging', permission: 'execute', enabled: true, sampleArgs: { flowId: 'cart_to_success', headless: true } },
      { name: 'capture_ui_screenshot', description: 'Captures visual diff before and after component change', permission: 'read', enabled: true, sampleArgs: { url: 'http://localhost:3000/checkout' } }
    ]
  },
  {
    id: 'mcp-slack',
    name: 'Slack Notification MCP',
    description: 'Broadcasting Change Impact Analysis reports and test regression alerts to dev channels.',
    icon: 'MessageSquare',
    status: 'connected',
    transport: 'sse',
    toolsCount: 3,
    apiConfigured: true,
    tools: [
      { name: 'notify_deployment_channel', description: 'Posts high blast radius warnings before PR merge', permission: 'write', enabled: true, sampleArgs: { channel: '#dev-alerts', severity: 'HIGH' } }
    ]
  }
];
