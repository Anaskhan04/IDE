import dns from 'node:dns';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEY_DIR = path.join(os.homedir(), '.intellicode');
const KEY_FILE = path.join(KEY_DIR, 'ai-keys.json');

let memoryKeys = new Map();
const connectionStates = new Map(); // providerKey -> 'configured' | 'connected' | 'disconnected' | 'error'

/**
 * Redact API keys from error messages or logs.
 */
export function sanitizeAiError(text, apiKey = '') {
  let out = String(text || '');
  if (apiKey) {
    out = out.split(apiKey).join('[REDACTED_KEY]');
  }
  out = out.replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]');
  out = out.replace(/sk-(?:ant-|proj-)?[0-9A-Za-z\-_]{16,}/g, '[REDACTED_KEY]');
  return out;
}

/**
 * Validate custom or preset provider base URLs to prevent SSRF / unsafe protocols.
 * Allows HTTPS for remote providers and localhost/127.0.0.1 HTTP for local engines like Ollama.
 */
export function validateProviderBaseUrl(baseUrl) {
  const raw = String(baseUrl || '').trim();
  if (!raw) return { valid: true, url: '' };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, error: 'Invalid provider base URL format.' };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';

  if (parsed.protocol === 'http:') {
    if (!isLocal) {
      return { valid: false, error: 'Insecure HTTP provider URLs are only allowed for localhost (e.g. Ollama).' };
    }
    return { valid: true, url: raw.replace(/\/+$/, '') };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: `Unsupported protocol "${parsed.protocol}". Use HTTPS (or HTTP for localhost).` };
  }

  // Block link-local / cloud metadata / private RFC1918 ranges on HTTPS
  if (
    /^169\.254\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === '0.0.0.0'
  ) {
    return { valid: false, error: 'Private or link-local IP addresses are not permitted for remote providers.' };
  }

  return { valid: true, url: raw.replace(/\/+$/, '') };
}

function loadKeysFromDisk() {
  if (memoryKeys.size > 0) return;
  try {
    if (fs.existsSync(KEY_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string' && v.trim()) {
            memoryKeys.set(k, v.trim());
            if (!connectionStates.has(k)) {
              connectionStates.set(k, 'configured');
            }
          }
        }
      }
    }
  } catch {
    // ignore corrupt file
  }
}

function isPrivateOrLoopbackIp(ip) {
  return (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip === '0.0.0.0' ||
    ip === '::1' ||
    /^fe80:/i.test(ip) ||
    /^fc00:/i.test(ip) ||
    /^fd/i.test(ip)
  );
}

async function verifySafeRemoteDns(urlStr) {
  if (!urlStr) return { valid: true };
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return { valid: true };
    }
    const { address } = await dns.promises.lookup(host);
    if (isPrivateOrLoopbackIp(address)) {
      return { valid: false, error: `Blocked SSRF target: "${host}" resolves to private/local IP.` };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

export function setBackendApiKey(providerKey, apiKey, persistToDisk = false) {
  loadKeysFromDisk();
  const keyName = String(providerKey || '').trim();
  if (!keyName) return;
  const val = String(apiKey || '').trim();

  if (val) {
    memoryKeys.set(keyName, val);
    connectionStates.set(keyName, 'configured');
  } else {
    memoryKeys.delete(keyName);
    connectionStates.set(keyName, 'disconnected');
  }

  if (!persistToDisk) return;
  try {
    fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
    const obj = Object.fromEntries(memoryKeys.entries());
    fs.writeFileSync(KEY_FILE, JSON.stringify(obj), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // ignore
  }
}

export function getBackendApiKey(providerKey) {
  loadKeysFromDisk();
  return memoryKeys.get(String(providerKey || '').trim()) || '';
}

export function clearAllBackendApiKeys(clearDisk = true) {
  memoryKeys = new Map();
  connectionStates.clear();
  if (!clearDisk) return;
  try {
    if (fs.existsSync(KEY_FILE)) fs.unlinkSync(KEY_FILE);
  } catch {
    // ignore
  }
}

export function setProviderConnectionState(providerKey, state) {
  if (!providerKey) return;
  connectionStates.set(providerKey, state);
}

export function getProviderKeyStatuses() {
  loadKeysFromDisk();
  const configuredProviders = {};
  const statuses = {};
  for (const [k, v] of memoryKeys.entries()) {
    configuredProviders[k] = Boolean(v);
    statuses[k] = connectionStates.get(k) || 'configured';
  }
  for (const [k, st] of connectionStates.entries()) {
    if (!statuses[k]) statuses[k] = st;
  }
  return { configuredProviders, statuses };
}

function mapProviderHttpError(status, rawMessage, providerName = 'Provider') {
  if (status === 401 || status === 403) {
    return `${providerName} authentication failed (${status}): invalid or unauthorized API key.`;
  }
  if (status === 404) {
    return `${providerName} model or endpoint not found (404). Sync models to verify availability.`;
  }
  if (status === 429) {
    return `${providerName} rate limit or quota exceeded (429). Wait and try again.`;
  }
  return rawMessage || `${providerName} API error (${status})`;
}

/**
 * Discover available models from a provider endpoint.
 */
export async function requestProviderModels({
  format = 'gemini',
  baseUrl = '',
  apiKey = '',
  providerKey = '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
}) {
  const effectiveKey = String(apiKey || getBackendApiKey(providerKey)).trim();
  const urlCheck = validateProviderBaseUrl(baseUrl);
  if (!urlCheck.valid) {
    return { success: false, status: 400, error: urlCheck.error };
  }
  if (fetchImpl === globalThis.fetch && urlCheck.url) {
    const dnsCheck = await verifySafeRemoteDns(urlCheck.url);
    if (!dnsCheck.valid) {
      return { success: false, status: 400, error: dnsCheck.error };
    }
  }
  if (fetchImpl === globalThis.fetch && urlCheck.url) {
    const dnsCheck = await verifySafeRemoteDns(urlCheck.url);
    if (!dnsCheck.valid) {
      return { success: false, status: 400, error: dnsCheck.error };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (format === 'gemini') {
      if (!effectiveKey) {
        return { success: false, status: 401, error: 'Google Gemini API key is required.' };
      }
      const rootUrl = urlCheck.url || 'https://generativelanguage.googleapis.com/v1beta';
      const apiRes = await fetchImpl(`${rootUrl}/models?key=${encodeURIComponent(effectiveKey)}`, {
        signal: controller.signal,
        redirect: 'error',
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        if (providerKey) setProviderConnectionState(providerKey, 'error');
        return {
          success: false,
          status: apiRes.status,
          error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message, 'Gemini'), effectiveKey),
        };
      }
      if (providerKey) setProviderConnectionState(providerKey, 'connected');
      const models = (Array.isArray(data?.models) ? data.models : [])
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => ({
          modelId: String(m.name || '').replace(/^models\//, ''),
          name: m.displayName || String(m.name || '').replace(/^models\//, ''),
          description: m.description || '',
          contextWindow: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}k` : 'Unknown',
        }))
        .filter((m) => m.modelId && /gemini/i.test(m.modelId));
      return { success: true, status: 200, models };
    }

    if (format === 'anthropic') {
      if (!effectiveKey) {
        return { success: false, status: 401, error: 'Anthropic API key is required.' };
      }
      const rootUrl = urlCheck.url || 'https://api.anthropic.com/v1';
      const apiRes = await fetchImpl(`${rootUrl}/models`, {
        headers: {
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        redirect: 'error',
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        if (providerKey) setProviderConnectionState(providerKey, 'error');
        return {
          success: false,
          status: apiRes.status,
          error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message, 'Anthropic'), effectiveKey),
        };
      }
      if (providerKey) setProviderConnectionState(providerKey, 'connected');
      const models = (Array.isArray(data?.data) ? data.data : []).map((m) => ({
        modelId: m.id,
        name: m.display_name || m.id,
        description: '',
        contextWindow: '200k',
      }));
      return { success: true, status: 200, models };
    }

    // OpenAI / OpenRouter / Groq / DeepSeek / Ollama
    const rootUrl = urlCheck.url || 'https://api.openai.com/v1';
    const headers = { 'Content-Type': 'application/json' };
    if (effectiveKey) headers.Authorization = `Bearer ${effectiveKey}`;
    const apiRes = await fetchImpl(`${rootUrl}/models`, { headers, signal: controller.signal, redirect: 'error' });
    const data = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
      if (providerKey) setProviderConnectionState(providerKey, 'error');
      return {
        success: false,
        status: apiRes.status,
        error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message || data?.message), effectiveKey),
      };
    }
    if (providerKey) setProviderConnectionState(providerKey, 'connected');
    const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
    const models = rawList.slice(0, 60).map((m) => ({
      modelId: m.id || m.name,
      name: m.name || m.id,
      description: m.description || '',
      contextWindow: m.context_length ? `${Math.round(m.context_length / 1000)}k` : 'Provider default',
    }));
    return { success: true, status: 200, models };
  } catch (err) {
    if (providerKey) setProviderConnectionState(providerKey, 'error');
    if (err?.name === 'AbortError') {
      return { success: false, status: 408, error: 'Connection timed out while querying provider models.' };
    }
    return { success: false, status: 502, error: sanitizeAiError(err?.message || 'Network error reaching provider.', effectiveKey) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute a chat completion request against Gemini, Anthropic, or OpenAI-compatible providers.
 */
export async function requestProviderChat({
  format = 'openai',
  baseUrl = '',
  apiKey = '',
  providerKey = '',
  modelId,
  messages = [],
  systemPrompt = '',
  temperature = 0.2,
  maxTokens = 8192,
  fetchImpl = globalThis.fetch,
  signal,
  timeoutMs = 60000,
}) {
  if (!modelId) {
    return { success: false, status: 400, error: 'Model ID is required.' };
  }
  const urlCheck = validateProviderBaseUrl(baseUrl);
  if (!urlCheck.valid) {
    return { success: false, status: 400, error: urlCheck.error };
  }
  if (fetchImpl === globalThis.fetch && urlCheck.url) {
    const dnsCheck = await verifySafeRemoteDns(urlCheck.url);
    if (!dnsCheck.valid) {
      return { success: false, status: 400, error: dnsCheck.error };
    }
  }

  const effectiveKey = String(apiKey || getBackendApiKey(providerKey)).trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    if (format === 'gemini') {
      if (!effectiveKey) {
        return { success: false, status: 401, error: 'Google Gemini API key is required.' };
      }
      const rootUrl = urlCheck.url || 'https://generativelanguage.googleapis.com/v1beta';
      const cleanModel = modelId.replace(/^models\//, '');
      const endpoint = `${rootUrl}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

      const payload = {
        contents: messages
          .filter((m) => m.role !== 'system' && m.content)
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content) }],
          })),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      };

      const apiRes = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'error',
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        if (providerKey) setProviderConnectionState(providerKey, 'error');
        return {
          success: false,
          status: apiRes.status,
          error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message, 'Gemini'), effectiveKey),
        };
      }
      if (providerKey) setProviderConnectionState(providerKey, 'connected');
      const replyText = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (!replyText) {
        return { success: false, status: 200, error: 'Gemini returned an empty response.' };
      }
      return {
        success: true,
        status: 200,
        content: replyText,
        usage: {
          promptTokens: data?.usageMetadata?.promptTokenCount || 0,
          completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data?.usageMetadata?.totalTokenCount || 0,
        },
      };
    }

    if (format === 'anthropic') {
      if (!effectiveKey) {
        return { success: false, status: 401, error: 'Anthropic API key is required.' };
      }
      const rootUrl = urlCheck.url || 'https://api.anthropic.com/v1';
      const endpoint = rootUrl.endsWith('/messages') ? rootUrl : `${rootUrl}/messages`;

      const apiRes = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: maxTokens,
          temperature,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: messages
            .filter((m) => m.role !== 'system' && m.content)
            .map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: String(m.content),
            })),
        }),
        signal: controller.signal,
        redirect: 'error',
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        if (providerKey) setProviderConnectionState(providerKey, 'error');
        return {
          success: false,
          status: apiRes.status,
          error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message, 'Anthropic'), effectiveKey),
        };
      }
      if (providerKey) setProviderConnectionState(providerKey, 'connected');
      const replyText = (data?.content || []).map((c) => c.text || '').join('').trim();
      return {
        success: true,
        status: 200,
        content: replyText,
        usage: {
          promptTokens: data?.usage?.input_tokens || 0,
          completionTokens: data?.usage?.output_tokens || 0,
          totalTokens: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
        },
      };
    }

    // OpenAI-compatible (OpenAI, Ollama, OpenRouter, Groq, DeepSeek)
    const rootUrl = urlCheck.url || 'https://api.openai.com/v1';
    const endpoint = rootUrl.endsWith('/chat/completions') ? rootUrl : `${rootUrl}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (effectiveKey) headers.Authorization = `Bearer ${effectiveKey}`;

    const openaiMessages = [];
    if (systemPrompt) openaiMessages.push({ role: 'system', content: systemPrompt });
    for (const m of messages) {
      if (m.content) {
        openaiMessages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
      }
    }

    const apiRes = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId, messages: openaiMessages, temperature, max_tokens: maxTokens }),
      signal: controller.signal,
      redirect: 'error',
    });
    const data = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
      if (providerKey) setProviderConnectionState(providerKey, 'error');
      return {
        success: false,
        status: apiRes.status,
        error: sanitizeAiError(mapProviderHttpError(apiRes.status, data?.error?.message || data?.message), effectiveKey),
      };
    }
    if (providerKey) setProviderConnectionState(providerKey, 'connected');
    return {
      success: true,
      status: 200,
      content: data?.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0,
      },
    };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { success: false, status: 499, aborted: true, error: 'Generation stopped or timed out.' };
    }
    if (providerKey) setProviderConnectionState(providerKey, 'error');
    return { success: false, status: 502, error: sanitizeAiError(err?.message || 'Network error contacting provider.', effectiveKey) };
  } finally {
    clearTimeout(timer);
  }
}
