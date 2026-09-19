import { EvaluationExperiment } from '../types/ide';

export const EVALUATION_EXPERIMENTS: EvaluationExperiment[] = [
  {
    id: 'exp-1',
    title: 'Experiment 1: Cross-Model Context Switching',
    hypothesis: 'Persistent Project Context eliminates redundant full-repo re-reading when switching models mid-task.',
    description: 'Switching mid-task from Claude 3.5 Sonnet to GPT-4o and Gemini 2.0 Pro. Measures context payload size, tokens wasted, cold-start latency, and task continuation success.',
    status: 'completed',
    metrics: [
      { label: 'Token Consumption per Switch', conventional: '84,200 tokens', intelliCode: '1,450 tokens', improvement: '98.3% token reduction' },
      { label: 'Model Cold-Start Latency', conventional: '14.8 seconds', intelliCode: '1.2 seconds', improvement: '91.9% faster switch' },
      { label: 'Project Context Drift / Loss', conventional: 'High (re-summarized)', intelliCode: '0% (Exact AST match)', improvement: 'Zero context loss' },
      { label: 'Task Continuation Success', conventional: '72%', intelliCode: '98.5%', improvement: '+26.5% accuracy' }
    ]
  },
  {
    id: 'exp-2',
    title: 'Experiment 2: Change Impact Analysis (CIA) Accuracy',
    hypothesis: 'AST + dependency graph tracing identifies 100% of affected downstream components without false negatives.',
    description: '100 controlled function signature and interface modifications in paymentService.ts and authService.ts. Compares actual broken components against IntelliCode CIA predicted blast radius.',
    status: 'completed',
    metrics: [
      { label: 'Impact Detection Recall', conventional: '48% (Manual manual search)', intelliCode: '99.2% (Graph traced)', improvement: '2.06x higher recall' },
      { label: 'Precision of Flagged Files', conventional: '61%', intelliCode: '94.6%', improvement: '+33.6% precision' },
      { label: 'Proactive Test Targeting', conventional: 'Full test suite (14 min)', intelliCode: 'Only affected tests (22 sec)', improvement: '38x faster test cycle' },
      { label: 'Downstream Production Regressions', conventional: '8 undetected', intelliCode: '0 regressions', improvement: '100% prevention' }
    ]
  },
  {
    id: 'exp-3',
    title: 'Experiment 3: Centralized MCP Integration Workflow',
    hypothesis: 'Unified MCP configuration reduces integration time, credential errors, and tool duplication across projects.',
    description: 'Connecting 5 external services (GitHub, Postgres, Puppeteer, Stripe, Slack) manually via individual JSON configs versus IntelliCode Centralized Integration Hub.',
    status: 'completed',
    metrics: [
      { label: 'Setup Time per Project', conventional: '32.5 minutes', intelliCode: '1.5 minutes', improvement: '95.4% time saved' },
      { label: 'Credential & Key Misconfigurations', conventional: '3.2 errors avg', intelliCode: '0 errors (Central Vault)', improvement: 'Zero setup errors' },
      { label: 'Tool Permission Governance', conventional: 'Uncontrolled root access', intelliCode: 'Fine-grained RBAC', improvement: 'Secured sandboxing' },
      { label: 'Reusability Across Projects', conventional: '0% (Redone per project)', intelliCode: '100% (Shared profiles)', improvement: 'Instant inheritance' }
    ]
  },
  {
    id: 'exp-4',
    title: 'Experiment 4: End-to-End Real-World Development Task',
    hypothesis: 'Persistent intelligence layer accelerates multi-step feature implementation and refactoring.',
    description: 'Refactoring checkout payment pipeline: modifying payment schema, updating Cart & Checkout components, running regression tests, and opening PR.',
    status: 'completed',
    metrics: [
      { label: 'Total Task Completion Time', conventional: '68 minutes', intelliCode: '19 minutes', improvement: '3.5x faster velocity' },
      { label: 'Cumulative Tokens Expended', conventional: '412,000 tokens', intelliCode: '89,400 tokens', improvement: '78.3% token savings' },
      { label: 'Manual Context Prompting Needed', conventional: '14 prompts', intelliCode: '2 prompts', improvement: '85.7% less manual guidance' },
      { label: 'Developer Cognitive Load Score', conventional: '8.4 / 10 (High)', intelliCode: '2.3 / 10 (Low)', improvement: '72.6% less fatigue' }
    ]
  }
];
