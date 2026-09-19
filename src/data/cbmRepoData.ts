import { ProjectFile, GraphNode, GraphEdge, CIAResult, CypherQueryResult, TracePathResult } from '../types/ide';

export const CBM_REPO_FILES: ProjectFile[] = [
  {
    id: 'cbm-main',
    name: 'main.c',
    path: 'src/main.c',
    language: 'typescript', // for syntax highlighting
    impactLevel: 'none',
    symbols: [
      { id: 'sym-main', name: 'main', kind: 'function', line: 55, exported: true, calls: ['cbm_mcp_dispatch', 'cbm_daemon_start', 'cbm_cli_execute_tool'] },
      { id: 'sym-cmd_dispatch', name: 'cbm_cmd_dispatch', kind: 'function', line: 85, exported: false, calls: ['cbm_mcp_init'] }
    ],
    content: `/*
 * main.c - Entry point for codebase-memory-mcp.
 *
 * Modes:
 *   (default)       Run as MCP server on stdin/stdout (JSON-RPC 2.0)
 *   cli <tool> <json>  Run a single tool call and print result
 *   --ui=true/false Enable/disable HTTP UI server (localhost:9749)
 *   --port=N        Set HTTP UI port (persisted, default 9749)
 */

#include "cbm.h"
#include "store/store.h"
#include "daemon/application.h"
#include "daemon/bootstrap.h"
#include "mcp/mcp.h"
#include "cli/cli.h"

int main(int argc, char **argv) {
    // 1. Initialize mimalloc and in-memory SQLite store
    cbm_store_t *store = cbm_store_init();
    if (!store) {
        fprintf(stderr, "[CBM] Failed to initialize graph store\\n");
        return 1;
    }

    // 2. Parse command-line flags
    if (argc > 1 && strcmp(argv[1], "cli") == 0) {
        return cbm_cli_execute_tool(store, argc - 2, argv + 2);
    }

    if (argc > 1 && strcmp(argv[1], "daemon") == 0) {
        return cbm_daemon_start(store);
    }

    // 3. Default: Run MCP JSON-RPC 2.0 server on stdin/stdout
    printf("[CBM] Starting codebase-memory-mcp server (JSON-RPC 2.0 stdio)...\\n");
    return cbm_mcp_dispatch(store);
}
`
  },
  {
    id: 'cbm-cypher',
    name: 'cypher.c',
    path: 'src/cypher/cypher.c',
    language: 'typescript',
    impactLevel: 'modified',
    isModified: true,
    symbols: [
      { id: 'sym-cbm_cypher_execute', name: 'cbm_cypher_execute', kind: 'function', line: 42, exported: true, calls: ['cbm_cypher_parse', 'cbm_store_query'], calledBy: ['cbm_mcp_dispatch', 'cbm_cli_execute_tool'] },
      { id: 'sym-cbm_cypher_parse', name: 'cbm_cypher_parse', kind: 'function', line: 95, exported: true, calls: ['cbm_lex_tokens'], calledBy: ['cbm_cypher_execute'] }
    ],
    content: `/*
 * cypher.c - Cypher query engine: lexer, parser, planner, executor.
 *
 * Translates a subset of Cypher into SQL queries against cbm_store.
 * Supports MATCH patterns with relationships, WHERE filters,
 * RETURN with COUNT/ORDER BY/LIMIT/DISTINCT in <1ms.
 */

#include "cypher/cypher.h"
#include "store/store.h"

int cbm_cypher_execute(cbm_store_t *store, const char *query, const char *project, 
                       int max_rows, cbm_cypher_result_t *out) {
    if (!store || !query || !out) return -1;

    cbm_query_t *ast = NULL;
    char *err = NULL;

    // Fast parse phase
    int parse_status = cbm_cypher_parse(query, &ast, &err);
    if (parse_status != 0) {
        out->error = err ? err : "Syntax error in Cypher query";
        return -1;
    }

    // High performance SQL execution against SQLite in-memory graph
    int status = cbm_store_execute_pattern(store, ast, project, max_rows, out);
    cbm_query_free(ast);
    return status;
}

int cbm_cypher_parse(const char *query, cbm_query_t **out, char **error) {
    // Cypher AST tokenization and clause validation
    return 0;
}
`
  },
  {
    id: 'cbm-mcp',
    name: 'mcp.c',
    path: 'src/mcp/mcp.c',
    language: 'typescript',
    impactLevel: 'direct',
    symbols: [
      { id: 'sym-cbm_mcp_dispatch', name: 'cbm_mcp_dispatch', kind: 'function', line: 30, exported: true, calls: ['cbm_cypher_execute', 'cbm_handle_trace_path', 'cbm_handle_detect_changes'] },
      { id: 'sym-cbm_handle_query_cypher', name: 'cbm_handle_query_cypher', kind: 'function', line: 75, exported: false, calls: ['cbm_cypher_execute'] }
    ],
    content: `/*
 * mcp.c - MCP server: JSON-RPC 2.0 over stdio with graph tools.
 *
 * Single-threaded event loop: read line -> parse -> dispatch -> respond.
 * Exposes 15 tools including query_cypher, trace_path, and detect_changes.
 */

#include "mcp/mcp.h"
#include "cypher/cypher.h"
#include "traces/traces.h"

int cbm_mcp_dispatch(cbm_store_t *store) {
    char buffer[4096];
    while (fgets(buffer, sizeof(buffer), stdin)) {
        // Parse incoming JSON-RPC 2.0 tool invocation
        if (strstr(buffer, "query_cypher")) {
            cbm_cypher_result_t res;
            cbm_cypher_execute(store, "MATCH (n) RETURN n", NULL, 100, &res);
        } else if (strstr(buffer, "trace_path")) {
            cbm_bfs_traverse(store, "processPayment", 3);
        }
    }
    return 0;
}
`
  },
  {
    id: 'cbm-store',
    name: 'store.c',
    path: 'src/store/store.c',
    language: 'typescript',
    impactLevel: 'direct',
    symbols: [
      { id: 'sym-cbm_store_init', name: 'cbm_store_init', kind: 'function', line: 15, exported: true, calls: ['sqlite3_open_v2'] },
      { id: 'sym-cbm_store_vacuum_zstd', name: 'cbm_store_vacuum_zstd', kind: 'function', line: 60, exported: true, calls: ['zstd_compress'] }
    ],
    content: `/*
 * store.c - SQLite in-memory graph database and persistent snapshot storage.
 *
 * Stores AST nodes, edges, file metadata, and symbol tables.
 * Exports compressed snapshots to .codebase-memory/graph.db.zst
 */

#include "store/store.h"

cbm_store_t* cbm_store_init(void) {
    cbm_store_t *s = malloc(sizeof(cbm_store_t));
    // Open in-memory SQLite database
    sqlite3_open(":memory:", &s->db);
    // Initialize node and edge schema
    sqlite3_exec(s->db, "CREATE TABLE nodes (id TEXT PRIMARY KEY, label TEXT, kind TEXT, file TEXT, loc INT);", NULL, NULL, NULL);
    sqlite3_exec(s->db, "CREATE TABLE edges (id TEXT PRIMARY KEY, src TEXT, tgt TEXT, type TEXT);", NULL, NULL, NULL);
    return s;
}

int cbm_store_vacuum_zstd(cbm_store_t *s, const char *out_path) {
    // VACUUM INTO compacted file, then zstd 1.5.7 compression (8-13:1 ratio)
    return 0;
}
`
  },
  {
    id: 'cbm-traces',
    name: 'traces.c',
    path: 'src/traces/traces.c',
    language: 'typescript',
    impactLevel: 'none',
    symbols: [
      { id: 'sym-cbm_bfs_traverse', name: 'cbm_bfs_traverse', kind: 'function', line: 20, exported: true, calls: ['sqlite3_step'] },
      { id: 'sym-cbm_extract_http_info', name: 'cbm_extract_http_info', kind: 'function', line: 45, exported: true }
    ],
    content: `/*
 * traces.c - OTLP trace processing and BFS call graph pathfinder.
 *
 * Implements trace_path BFS traversal across function callers/callees.
 */

#include "traces/traces.h"

int cbm_bfs_traverse(cbm_store_t *store, const char *symbol, int depth) {
    // Breadth-First-Search across CALLS and IMPORTS edges in <10ms
    return 0;
}
`
  },
  {
    id: 'cbm-daemon',
    name: 'daemon.c',
    path: 'src/daemon/daemon.c',
    language: 'typescript',
    impactLevel: 'none',
    symbols: [
      { id: 'sym-cbm_daemon_start', name: 'cbm_daemon_start', kind: 'function', line: 18, exported: true }
    ],
    content: `/*
 * daemon.c - Session coordination daemon.
 *
 * Coordinates concurrent coding agent sessions (Claude Code, Cursor, Zed)
 * to avoid duplicate indexing or redundant file watching.
 */

#include "daemon/daemon.h"

int cbm_daemon_start(cbm_store_t *store) {
    // OS admission barrier and named pipe / domain socket IPC loop
    return 0;
}
`
  }
];

export const CBM_GRAPH_NODES: GraphNode[] = [
  // Cypher Engine Cluster
  { id: 'cbm-node-cypher-c', label: 'cypher.c', type: 'File', module: 'cypher', cluster: 'Cypher Query Engine', path: 'src/cypher/cypher.c', impactStatus: 'modified', connectionsCount: 6, x: 480, y: 220, loc: 1420 },
  { id: 'cbm-node-sym-cypher_exec', label: 'cbm_cypher_execute()', type: 'Function', module: 'cypher', cluster: 'Cypher Query Engine', path: 'src/cypher/cypher.c', impactStatus: 'modified', connectionsCount: 5, x: 560, y: 150, returnType: 'int', loc: 45 },
  { id: 'cbm-node-sym-cypher_parse', label: 'cbm_cypher_parse()', type: 'Function', module: 'cypher', cluster: 'Cypher Query Engine', path: 'src/cypher/cypher.c', impactStatus: 'none', connectionsCount: 3, x: 380, y: 140, returnType: 'int', loc: 110 },

  // MCP Protocol Server Cluster
  { id: 'cbm-node-mcp-c', label: 'mcp.c', type: 'File', module: 'mcp', cluster: 'MCP Protocol Server', path: 'src/mcp/mcp.c', impactStatus: 'direct', connectionsCount: 7, x: 670, y: 280, loc: 2150 },
  { id: 'cbm-node-sym-mcp_dispatch', label: 'cbm_mcp_dispatch()', type: 'Function', module: 'mcp', cluster: 'MCP Protocol Server', path: 'src/mcp/mcp.c', impactStatus: 'direct', connectionsCount: 6, x: 750, y: 200, returnType: 'int', loc: 68 },
  { id: 'cbm-node-compact-out', label: 'compact_out.c', type: 'File', module: 'mcp', cluster: 'MCP Protocol Server', path: 'src/mcp/compact_out.c', impactStatus: 'none', connectionsCount: 3, x: 800, y: 340, loc: 420 },

  // Core Main & CLI
  { id: 'cbm-node-main-c', label: 'main.c', type: 'File', module: 'core', cluster: 'Entry & CLI', path: 'src/main.c', impactStatus: 'none', connectionsCount: 5, x: 260, y: 300, loc: 520 },
  { id: 'cbm-node-cli-c', label: 'cli.c', type: 'File', module: 'cli', cluster: 'Entry & CLI', path: 'src/cli/cli.c', impactStatus: 'direct', connectionsCount: 4, x: 200, y: 180, loc: 680 },

  // SQLite Store & Buffer Cluster
  { id: 'cbm-node-store-c', label: 'store.c', type: 'File', module: 'store', cluster: 'In-Memory SQLite Store', path: 'src/store/store.c', impactStatus: 'direct', connectionsCount: 6, x: 440, y: 380, loc: 1890 },
  { id: 'cbm-node-sym-store_init', label: 'cbm_store_init()', type: 'Function', module: 'store', cluster: 'In-Memory SQLite Store', path: 'src/store/store.c', impactStatus: 'none', connectionsCount: 4, x: 340, y: 460, returnType: 'cbm_store_t*', loc: 35 },
  { id: 'cbm-node-graph-buffer', label: 'graph_buffer.c', type: 'File', module: 'store', cluster: 'In-Memory SQLite Store', path: 'src/graph_buffer/graph_buffer.c', impactStatus: 'none', connectionsCount: 3, x: 520, y: 480, loc: 610 },

  // Call Graph Traces & OTLP
  { id: 'cbm-node-traces-c', label: 'traces.c', type: 'File', module: 'traces', cluster: 'Call Graph & BFS Pathfinder', path: 'src/traces/traces.c', impactStatus: 'none', connectionsCount: 4, x: 670, y: 440, loc: 920 },
  { id: 'cbm-node-sym-bfs', label: 'cbm_bfs_traverse()', type: 'Function', module: 'traces', cluster: 'Call Graph & BFS Pathfinder', path: 'src/traces/traces.c', impactStatus: 'none', connectionsCount: 3, x: 790, y: 460, returnType: 'int', loc: 85 },

  // Daemon & Coordination
  { id: 'cbm-node-daemon-c', label: 'daemon.c', type: 'File', module: 'daemon', cluster: 'Session Coordination Daemon', path: 'src/daemon/daemon.c', impactStatus: 'none', connectionsCount: 4, x: 120, y: 400, loc: 1100 },

  // Test Suites
  { id: 'cbm-node-test-cypher', label: 'test_cypher.c', type: 'Test', module: 'tests', cluster: 'Quality Assurance', path: 'tests/test_cypher.c', impactStatus: 'indirect', connectionsCount: 2, x: 400, y: 60 },
  { id: 'cbm-node-test-mcp', label: 'test_mcp.c', type: 'Test', module: 'tests', cluster: 'Quality Assurance', path: 'tests/test_mcp.c', impactStatus: 'indirect', connectionsCount: 2, x: 680, y: 50 }
];

export const CBM_GRAPH_EDGES: GraphEdge[] = [
  // main.c dispatches
  { id: 'cbm-e1', source: 'cbm-node-main-c', target: 'cbm-node-mcp-c', type: 'CALLS', label: 'dispatches', isImpactPath: false },
  { id: 'cbm-e2', source: 'cbm-node-main-c', target: 'cbm-node-daemon-c', type: 'CALLS', label: 'launches', isImpactPath: false },
  { id: 'cbm-e3', source: 'cbm-node-main-c', target: 'cbm-node-cli-c', type: 'CALLS', label: 'invokes', isImpactPath: false },
  { id: 'cbm-e4', source: 'cbm-node-main-c', target: 'cbm-node-store-c', type: 'CALLS', label: 'initializes', isImpactPath: false },

  // mcp.c tool calls
  { id: 'cbm-e5', source: 'cbm-node-mcp-c', target: 'cbm-node-sym-cypher_exec', type: 'CALLS', label: 'query_cypher', isImpactPath: true, confidence: 1.0 },
  { id: 'cbm-e6', source: 'cbm-node-mcp-c', target: 'cbm-node-traces-c', type: 'CALLS', label: 'trace_path', isImpactPath: false },
  { id: 'cbm-e7', source: 'cbm-node-mcp-c', target: 'cbm-node-store-c', type: 'CALLS', label: 'reads store', isImpactPath: true },

  // cli.c
  { id: 'cbm-e8', source: 'cbm-node-cli-c', target: 'cbm-node-sym-cypher_exec', type: 'CALLS', label: 'executes', isImpactPath: true },

  // cypher engine
  { id: 'cbm-e9', source: 'cbm-node-sym-cypher_exec', target: 'cbm-node-sym-cypher_parse', type: 'CALLS', label: 'parses', isImpactPath: false },
  { id: 'cbm-e10', source: 'cbm-node-cypher-c', target: 'cbm-node-store-c', type: 'CALLS', label: 'SQL queries', isImpactPath: true },
  { id: 'cbm-e11', source: 'cbm-node-store-c', target: 'cbm-node-graph-buffer', type: 'CALLS', label: 'buffers LZ4', isImpactPath: false },

  // Tests
  { id: 'cbm-e12', source: 'cbm-node-test-cypher', target: 'cbm-node-cypher-c', type: 'TESTS', label: 'TESTS', isImpactPath: true },
  { id: 'cbm-e13', source: 'cbm-node-test-mcp', target: 'cbm-node-mcp-c', type: 'TESTS', label: 'TESTS', isImpactPath: true }
];

export const CBM_CIA_RESULT: CIAResult = {
  targetId: 'cbm-cypher',
  targetName: 'cypher.c : cbm_cypher_execute()',
  targetPath: 'src/cypher/cypher.c',
  blastRadiusScore: 82,
  severity: 'critical',
  directAffected: [
    {
      id: 'cbm-mcp',
      name: 'mcp.c',
      path: 'src/mcp/mcp.c',
      reason: 'Direct call site: query_cypher MCP tool handler dispatches into cbm_cypher_execute',
      type: 'service'
    },
    {
      id: 'cbm-cli',
      name: 'cli.c',
      path: 'src/cli/cli.c',
      reason: 'One-shot CLI command runner codebase-memory-mcp cli query_cypher calls execution pipeline',
      type: 'controller'
    },
    {
      id: 'cbm-store',
      name: 'store.c',
      path: 'src/store/store.c',
      reason: 'SQL query generation interface interacts directly with in-memory SQLite tables',
      type: 'service'
    }
  ],
  indirectAffected: [
    {
      id: 'cbm-node-test-cypher',
      name: 'test_cypher.c',
      path: 'tests/test_cypher.c',
      depth: 2,
      reason: '8,050 automated Cypher unit tests depend on cbm_cypher_result_t struct ABI'
    },
    {
      id: 'cbm-node-test-mcp',
      name: 'test_mcp.c',
      path: 'tests/test_mcp.c',
      depth: 2,
      reason: 'MCP JSON-RPC response serialization assertions for query_cypher'
    }
  ],
  recommendedTests: [
    {
      id: 'test-cbm-cypher',
      file: 'tests/test_cypher.c',
      testSuite: 'Cypher Query Engine Unit Tests',
      priority: 'urgent',
      reason: 'Verifies MATCH patterns, WHERE filters, and sub-millisecond execution budget'
    },
    {
      id: 'test-cbm-mcp',
      file: 'tests/test_mcp.c',
      testSuite: 'MCP Protocol Server Integration',
      priority: 'high',
      reason: 'Validates JSON-RPC 2.0 query_cypher response format'
    }
  ]
};

export const CBM_SAMPLE_CYPHER_QUERIES = [
  {
    name: 'Find all callers of cbm_cypher_execute()',
    query: 'MATCH (caller)-[:CALLS]->(f:Function) WHERE f.name = "cbm_cypher_execute" RETURN caller.label, caller.type, caller.file'
  },
  {
    name: 'Discover functions in MCP Protocol Server cluster',
    query: 'MATCH (f:Function) WHERE f.cluster = "MCP Protocol Server" RETURN f.name, f.returnType, f.loc'
  },
  {
    name: 'Trace dependencies of main.c',
    query: 'MATCH (m:File)-[:CALLS]->(target) WHERE m.name = "main.c" RETURN target.label AS dependency, target.module'
  },
  {
    name: 'Find all Test Suites and targets',
    query: 'MATCH (t:Test)-[:TESTS]->(target) RETURN t.label AS suite, target.label AS tested_component'
  }
];
