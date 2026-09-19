import { AIModel } from '../types/ide';

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    version: '20241022',
    badge: 'Architect & Refactor',
    contextWindow: '200k',
    costPer1k: '$0.003',
    description: 'Specialized in multi-file architectural synthesis, clean code generation, and AST reasoning.',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    version: '2024-11-20',
    badge: 'Code Review & Logic',
    contextWindow: '128k',
    costPer1k: '$0.0025',
    description: 'High-speed reasoning, API validation, and comprehensive regression test synthesis.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'gemini-2-0-pro',
    name: 'Gemini 2.0 Pro',
    provider: 'Google',
    version: 'Exp-02',
    badge: 'Deep AST & Context',
    contextWindow: '2M tokens',
    costPer1k: '$0.0015',
    description: 'Massive context indexing, cross-repo dependency mapping, and multimodal diagram parsing.',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    version: '671B MoE',
    badge: 'Formal Verification',
    contextWindow: '64k',
    costPer1k: '$0.0005',
    description: 'Deep mathematical reasoning, edge-case vulnerability detection, and algorithmic proof.',
    color: 'from-purple-500 to-indigo-600'
  }
];
