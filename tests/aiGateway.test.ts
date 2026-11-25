import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  clearAllBackendApiKeys,
  getBackendApiKey,
  requestProviderChat,
  requestProviderModels,
  sanitizeAiError,
  setBackendApiKey,
  validateProviderBaseUrl,
} from '../vite-ai-utils.js';
import {
  isSensitiveFilePath,
  redactInlineSecrets,
  selectRelevantContext,
} from '../src/utils/aiContextBuilder';
import {
  isSafeGeneratedPath,
  parseGeneratedFilesFromResponse,
} from '../src/utils/aiService';
import { buildGraphFromFiles } from '../src/utils/astParser';
import type { ProjectFile } from '../src/types/ide';

describe('AI Model Gateway & Intelligent Assistant (Mocked Providers)', () => {
  beforeEach(() => {
    clearAllBackendApiKeys(false);
  });

  it('validates provider base URLs and blocks unsafe SSRF/file protocols', () => {
    assert.strictEqual(validateProviderBaseUrl('https://api.openai.com/v1').valid, true);
    assert.strictEqual(validateProviderBaseUrl('http://localhost:11434/v1').valid, true);
    assert.strictEqual(validateProviderBaseUrl('http://evil.example.com/v1').valid, false);
    assert.strictEqual(validateProviderBaseUrl('file:///etc/passwd').valid, false);
    assert.strictEqual(validateProviderBaseUrl('https://169.254.169.254/latest').valid, false);
  });

  it('stores API keys on backend only and redacts keys from error messages', async () => {
    const secret = 'AIzaSyFakeSecretKey1234567890abc';
    setBackendApiKey('google', secret, false);
    assert.strictEqual(getBackendApiKey('google'), secret);

    const errText = sanitizeAiError(`Request to ?key=${secret} failed`, secret);
    assert.strictEqual(errText.includes(secret), false);
    assert.ok(errText.includes('[REDACTED_KEY]'));
  });

  it('formats Gemini, Anthropic, and OpenAI requests and handles 401/429/abort errors', async () => {
    const geminiRes = await requestProviderChat({
      format: 'gemini',
      modelId: 'gemini-2.5-flash',
      apiKey: 'AIzaTest12345678901234567890',
      messages: [{ role: 'user', content: 'hi' }],
      systemPrompt: 'sys',
      fetchImpl: (async (url: string, init: any) => {
        assert.ok(url.includes('generativelanguage.googleapis.com'));
        const body = JSON.parse(init.body);
        assert.ok(body.systemInstruction);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          }),
        };
      }) as any,
    });
    assert.strictEqual(geminiRes.success, true);
    assert.strictEqual(geminiRes.content, 'Hello from Gemini');
    assert.strictEqual(geminiRes.usage?.totalTokens, 15);

    const rateLimitRes = await requestProviderChat({
      format: 'openai',
      modelId: 'gpt-4o',
      apiKey: 'sk-test12345678901234567890',
      messages: [{ role: 'user', content: 'hi' }],
      fetchImpl: (async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Too many requests' } }),
      })) as any,
    });
    assert.strictEqual(rateLimitRes.success, false);
    assert.ok(rateLimitRes.error && rateLimitRes.error.includes('429'));

    const controller = new AbortController();
    controller.abort();
    const abortedRes = await requestProviderChat({
      format: 'anthropic',
      modelId: 'claude-3-5-sonnet-latest',
      apiKey: 'sk-ant-test1234567890123456',
      messages: [{ role: 'user', content: 'hi' }],
      signal: controller.signal,
    });
    assert.strictEqual(abortedRes.success, false);
    assert.strictEqual(abortedRes.aborted, true);
  });

  it('discovers models from provider endpoints', async () => {
    const modelsRes = await requestProviderModels({
      format: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      fetchImpl: (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'qwen2.5-coder:7b' }] }),
      })) as any,
    });
    assert.strictEqual(modelsRes.success, true);
    assert.strictEqual(modelsRes.models?.[0]?.modelId, 'qwen2.5-coder:7b');
  });

  it('selects relevant AST/graph context and excludes secrets and .env files', () => {
    const svc: ProjectFile = {
      id: '1',
      name: 'math.ts',
      path: 'src/math.ts',
      language: 'typescript',
      content: 'export function add(a: number, b: number) { return a + b; }',
    };
    const app: ProjectFile = {
      id: '2',
      name: 'app.ts',
      path: 'src/app.ts',
      language: 'typescript',
      content: 'import { add } from "./math";\nexport function run() { return add(1, 2); }',
    };
    const envFile: ProjectFile = {
      id: '3',
      name: '.env',
      path: '.env',
      language: 'text',
      content: 'OPENAI_API_KEY=sk-secret12345678901234567890',
    };

    const { nodes, edges } = buildGraphFromFiles([svc, app, envFile]);
    const bundle = selectRelevantContext({
      projectName: 'test-proj',
      files: [svc, app, envFile],
      activeFile: app,
      selectedCode: 'add(1, 2)',
      attachedPaths: ['.env'],
      graphNodes: nodes,
      graphEdges: edges,
      diagnostics: [],
    });

    assert.ok(bundle.includedFiles.some((f) => f.path === 'src/app.ts'));
    assert.ok(bundle.includedFiles.some((f) => f.path === 'src/math.ts' && f.reason === 'Graph Dependency'));
    assert.ok(bundle.excludedSensitive.includes('.env'));
    assert.strictEqual(bundle.systemPrompt.includes('sk-secret'), false);
    assert.strictEqual(isSensitiveFilePath('.env.local'), true);
    assert.strictEqual(redactInlineSecrets('key=ghp_abcdef1234567890').includes('ghp_'), false);
  });

  it('parses generated files safely and rejects path traversal or sensitive targets', () => {
    assert.strictEqual(isSafeGeneratedPath('src/utils/helper.ts'), true);
    assert.strictEqual(isSafeGeneratedPath('../../etc/passwd'), false);
    assert.strictEqual(isSafeGeneratedPath('C:\\Windows\\System32\\cmd.exe'), false);
    assert.strictEqual(isSafeGeneratedPath('.env'), false);
    assert.strictEqual(isSafeGeneratedPath('.git/config'), false);

    const md = [
      '```ts file="src/ok.ts"\nexport const ok = true;\n```',
      '```ts file="../../evil.ts"\nexport const bad = true;\n```',
      '```env file=".env"\nSECRET=123\n```',
    ].join('\n');

    const parsed = parseGeneratedFilesFromResponse(md);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].path, 'src/ok.ts');
  });
});
