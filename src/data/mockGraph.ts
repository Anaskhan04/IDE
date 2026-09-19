import { GraphNode, GraphEdge, CIAResult, CypherQueryResult, TracePathResult } from '../types/ide';

export const INITIAL_GRAPH_NODES: GraphNode[] = [
  // Payments Cluster (Louvain Community #1)
  { 
    id: 'node-payment-service', 
    label: 'paymentService.ts', 
    type: 'File', 
    module: 'services', 
    cluster: 'Billing & Payments',
    path: 'src/services/paymentService.ts', 
    impactStatus: 'modified', 
    connectionsCount: 7, 
    x: 450, 
    y: 280,
    loc: 65 
  },
  { 
    id: 'node-sym-processPayment', 
    label: 'processPayment()', 
    type: 'Function', 
    module: 'services', 
    cluster: 'Billing & Payments',
    path: 'src/services/paymentService.ts', 
    impactStatus: 'modified', 
    connectionsCount: 6, 
    x: 530, 
    y: 190,
    returnType: 'Promise<PaymentReceipt>',
    loc: 32
  },
  { 
    id: 'node-sym-validateCard', 
    label: 'validateCard()', 
    type: 'Function', 
    module: 'services', 
    cluster: 'Billing & Payments',
    path: 'src/services/paymentService.ts', 
    impactStatus: 'none', 
    connectionsCount: 2, 
    x: 410, 
    y: 180,
    returnType: 'boolean',
    loc: 8
  },
  { 
    id: 'node-route-charge', 
    label: 'POST /api/v2/charge', 
    type: 'Route', 
    module: 'gateway', 
    cluster: 'Billing & Payments',
    path: 'https://gateway.stripe.com/v2/charge', 
    impactStatus: 'none', 
    connectionsCount: 2, 
    x: 580, 
    y: 350 
  },

  // Checkout & Cart Cluster (Louvain Community #2)
  { 
    id: 'node-checkout-page', 
    label: 'CheckoutPage.tsx', 
    type: 'File', 
    module: 'components', 
    cluster: 'Client Experience',
    path: 'src/components/CheckoutPage.tsx', 
    impactStatus: 'direct', 
    connectionsCount: 5, 
    x: 640, 
    y: 110,
    loc: 48
  },
  { 
    id: 'node-cart-store', 
    label: 'cartStore.ts', 
    type: 'File', 
    module: 'store', 
    cluster: 'Client Experience',
    path: 'src/store/cartStore.ts', 
    impactStatus: 'direct', 
    connectionsCount: 4, 
    x: 370, 
    y: 90,
    loc: 24
  },
  { 
    id: 'node-order-service', 
    label: 'orderService.ts', 
    type: 'File', 
    module: 'services', 
    cluster: 'Fulfillment',
    path: 'src/services/orderService.ts', 
    impactStatus: 'direct', 
    connectionsCount: 4, 
    x: 720, 
    y: 260,
    loc: 38
  },

  // Auth & Identity Cluster (Louvain Community #3)
  { 
    id: 'node-auth-service', 
    label: 'authService.ts', 
    type: 'File', 
    module: 'services', 
    cluster: 'Identity & Auth',
    path: 'src/services/authService.ts', 
    impactStatus: 'none', 
    connectionsCount: 5, 
    x: 180, 
    y: 340,
    loc: 42
  },
  { 
    id: 'node-session-manager', 
    label: 'SessionManager', 
    type: 'Class', 
    module: 'auth', 
    cluster: 'Identity & Auth',
    path: 'src/auth/sessionManager.ts', 
    impactStatus: 'none', 
    connectionsCount: 3, 
    x: 260, 
    y: 460,
    loc: 20
  },
  { 
    id: 'node-login-page', 
    label: 'LoginPage.tsx', 
    type: 'File', 
    module: 'components', 
    cluster: 'Identity & Auth',
    path: 'src/components/LoginPage.tsx', 
    impactStatus: 'none', 
    connectionsCount: 2, 
    x: 100, 
    y: 460,
    loc: 35
  },
  { 
    id: 'node-user-service', 
    label: 'userService.ts', 
    type: 'File', 
    module: 'services', 
    cluster: 'Identity & Auth',
    path: 'src/services/userService.ts', 
    impactStatus: 'none', 
    connectionsCount: 3, 
    x: 120, 
    y: 220,
    loc: 28
  },

  // Test Suites
  { 
    id: 'node-payment-test', 
    label: 'payment.test.ts', 
    type: 'Test', 
    module: 'tests', 
    cluster: 'Quality Assurance',
    path: 'tests/unit/payment.test.ts', 
    impactStatus: 'indirect', 
    connectionsCount: 2, 
    x: 290, 
    y: 240 
  },
  { 
    id: 'node-checkout-e2e', 
    label: 'checkout.e2e.ts', 
    type: 'Test', 
    module: 'tests', 
    cluster: 'Quality Assurance',
    path: 'tests/e2e/checkout.e2e.ts', 
    impactStatus: 'indirect', 
    connectionsCount: 2, 
    x: 800, 
    y: 150 
  },

  // MCP Integrations
  { 
    id: 'node-mcp-stripe', 
    label: 'Stripe Gateway MCP', 
    type: 'MCP', 
    module: 'integrations', 
    cluster: 'External Mesh',
    path: 'mcp://stripe-server', 
    impactStatus: 'none', 
    connectionsCount: 2, 
    x: 480, 
    y: 440 
  },
  { 
    id: 'node-mcp-postgres', 
    label: 'PostgreSQL DB MCP', 
    type: 'MCP', 
    module: 'integrations', 
    cluster: 'External Mesh',
    path: 'mcp://postgres-server', 
    impactStatus: 'none', 
    connectionsCount: 3, 
    x: 760, 
    y: 420 
  }
];

export const INITIAL_GRAPH_EDGES: GraphEdge[] = [
  // Tree-Sitter AST Calls & Imports
  { id: 'e1', source: 'node-checkout-page', target: 'node-payment-service', type: 'IMPORTS', label: 'IMPORTS', isImpactPath: true, confidence: 1.0 },
  { id: 'e2', source: 'node-checkout-page', target: 'node-sym-processPayment', type: 'CALLS', label: 'CALLS', isImpactPath: true, confidence: 0.98 },
  { id: 'e3', source: 'node-sym-processPayment', target: 'node-sym-validateCard', type: 'CALLS', label: 'CALLS', isImpactPath: false, confidence: 1.0 },
  { id: 'e4', source: 'node-sym-processPayment', target: 'node-route-charge', type: 'HTTP_CALLS', label: 'HTTP_CALLS', isImpactPath: true, confidence: 0.95 },
  { id: 'e5', source: 'node-order-service', target: 'node-payment-service', type: 'CALLS', label: 'CALLS', isImpactPath: true, confidence: 0.96 },
  { id: 'e6', source: 'node-checkout-page', target: 'node-cart-store', type: 'DATA_FLOWS', label: 'DATA_FLOWS', isImpactPath: true, confidence: 0.92 },
  { id: 'e7', source: 'node-payment-test', target: 'node-payment-service', type: 'TESTS', label: 'TESTS', isImpactPath: true, confidence: 1.0 },
  { id: 'e8', source: 'node-checkout-e2e', target: 'node-checkout-page', type: 'TESTS', label: 'TESTS', isImpactPath: true, confidence: 1.0 },
  { id: 'e9', source: 'node-payment-service', target: 'node-mcp-stripe', type: 'CALL_REFERENCE', label: 'DISPATCHES', isImpactPath: false },
  { id: 'e10', source: 'node-order-service', target: 'node-mcp-postgres', type: 'DATA_FLOWS', label: 'PERSISTS', isImpactPath: false },

  // Auth cluster
  { id: 'e11', source: 'node-auth-service', target: 'node-session-manager', type: 'CALLS', label: 'CALLS', confidence: 1.0 },
  { id: 'e12', source: 'node-login-page', target: 'node-auth-service', type: 'HTTP_CALLS', label: 'HTTP_CALLS', confidence: 0.94 },
  { id: 'e13', source: 'node-user-service', target: 'node-auth-service', type: 'CALLS', label: 'CALLS', confidence: 0.97 }
];

export const DEFAULT_CIA_RESULT: CIAResult = {
  targetId: 'payment-service',
  targetName: 'paymentService.ts : processPayment()',
  targetPath: 'src/services/paymentService.ts',
  blastRadiusScore: 78,
  severity: 'high',
  directAffected: [
    {
      id: 'checkout-page',
      name: 'CheckoutPage.tsx',
      path: 'src/components/CheckoutPage.tsx',
      reason: 'Tree-Sitter AST detected call site: processPayment() invocation with PaymentPayload structure',
      type: 'component'
    },
    {
      id: 'cart-controller',
      name: 'cartStore.ts',
      path: 'src/store/cartStore.ts',
      reason: 'Data flow dependency: Cart totalAmount mapped into payload.amount',
      type: 'state'
    },
    {
      id: 'order-service',
      name: 'orderService.ts',
      path: 'src/services/orderService.ts',
      reason: 'Type binding: expects PaymentReceipt transactionId returned by paymentService',
      type: 'service'
    }
  ],
  indirectAffected: [
    {
      id: 'node-checkout-e2e',
      name: 'checkout.e2e.ts',
      path: 'tests/e2e/checkout.e2e.ts',
      depth: 2,
      reason: 'E2E browser automated test asserts on confirmation dialog after processPayment()'
    },
    {
      id: 'node-admin-portal',
      name: 'AdminOrderManager.tsx',
      path: 'src/admin/AdminOrderManager.tsx',
      depth: 3,
      reason: 'Transitive call chain to refundTransaction() via order lifecycle listener'
    }
  ],
  recommendedTests: [
    {
      id: 'test-payment-unit',
      file: 'tests/unit/payment.test.ts',
      testSuite: 'PaymentService Unit Tests',
      priority: 'urgent',
      reason: 'Validates updated transaction payload & mock gateway handshake'
    },
    {
      id: 'test-checkout-e2e',
      file: 'tests/e2e/checkout.e2e.ts',
      testSuite: 'Checkout Flow E2E Regression',
      priority: 'high',
      reason: 'Ensures UI checkout button state and transaction receipt confirmation work'
    }
  ]
};

// Cypher query examples supported by codebase-memory-mcp
export const SAMPLE_CYPHER_QUERIES = [
  {
    name: 'Find all callers of processPayment()',
    query: 'MATCH (c)-[:CALLS]->(f:Function) WHERE f.name = "processPayment" RETURN c.label AS caller, c.type AS kind, c.path AS file'
  },
  {
    name: 'Discover HTTP routes and consumer functions',
    query: 'MATCH (f:Function)-[:HTTP_CALLS]->(r:Route) RETURN f.name AS consumer, r.label AS endpoint'
  },
  {
    name: 'Find all functions in Billing & Payments cluster',
    query: 'MATCH (n:Function) WHERE n.cluster = "Billing & Payments" RETURN n.name, n.returnType, n.loc'
  },
  {
    name: 'Detect dead code (unreferenced functions)',
    query: 'MATCH (f:Function) WHERE NOT ()-[:CALLS]->(f) AND f.name <> "main" RETURN f.name, f.path'
  }
];
