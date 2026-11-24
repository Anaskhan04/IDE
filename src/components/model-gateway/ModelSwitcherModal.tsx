import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { fetchAvailableProviderModels, sendModelRequest } from '../../utils/aiService';
import type { AIModel, AIProviderFormat } from '../../types/ide';

const PROVIDER_PRESETS: {
  label: string;
  provider: string;
  providerKey: string;
  apiFormat: AIProviderFormat;
  baseUrl: string;
  exampleModel: string;
  requiresApiKey: boolean;
}[] = [
  {
    label: 'Google Gemini',
    provider: 'Google',
    providerKey: 'google',
    apiFormat: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    exampleModel: 'gemini-2.5-flash',
    requiresApiKey: true,
  },
  {
    label: 'OpenRouter',
    provider: 'OpenRouter',
    providerKey: 'openrouter',
    apiFormat: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    exampleModel: 'anthropic/claude-3.5-sonnet',
    requiresApiKey: true,
  },
  {
    label: 'Groq',
    provider: 'Groq',
    providerKey: 'groq',
    apiFormat: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    exampleModel: 'llama-3.3-70b-versatile',
    requiresApiKey: true,
  },
  {
    label: 'Ollama (Local)',
    provider: 'Ollama',
    providerKey: 'ollama',
    apiFormat: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    exampleModel: 'qwen2.5-coder:7b',
    requiresApiKey: false,
  },
  {
    label: 'Custom OpenAI-Compatible',
    provider: 'Custom Provider',
    providerKey: '',
    apiFormat: 'openai',
    baseUrl: 'https://api.example.com/v1',
    exampleModel: 'my-model-id',
    requiresApiKey: true,
  },
];

export const ModelSwitcherModal: React.FC = () => {
  const {
    isModelSwitchingModalOpen,
    setIsModelSwitchingModalOpen,
    activeModel,
    setActiveModel,
    allModels,
    addCustomModel,
    removeCustomModel,
    apiKeys,
    setApiKey,
    sendChatMessage,
    masterPrompt,
  } = useIDE();

  const [tab, setTab] = useState<'models' | 'custom'>('models');
  const [selectedKeyProvider, setSelectedKeyProvider] = useState<string>(activeModel.providerKey);
  const [keyDraft, setKeyDraft] = useState<string>(apiKeys[activeModel.providerKey] || '');
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<{ status: 'idle' | 'testing' | 'ok' | 'error'; message?: string }>({
    status: 'idle',
  });

  // Custom model / provider form states
  const [customName, setCustomName] = useState('');
  const [customProvider, setCustomProvider] = useState('Custom Provider');
  const [customProviderKey, setCustomProviderKey] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [customFormat, setCustomFormat] = useState<AIProviderFormat>('openai');
  const [customBaseUrl, setCustomBaseUrl] = useState('https://api.openai.com/v1');
  const [customContextWindow, setCustomContextWindow] = useState('128k');
  const [customRequiresKey, setCustomRequiresKey] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (isModelSwitchingModalOpen) {
      setSelectedKeyProvider(activeModel.providerKey);
      setKeyDraft(apiKeys[activeModel.providerKey] || '');
      setTestState({ status: 'idle' });
      setCustomError(null);
    }
  }, [isModelSwitchingModalOpen, activeModel.providerKey, apiKeys]);

  useEffect(() => {
    if (!isModelSwitchingModalOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModelSwitchingModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModelSwitchingModalOpen, setIsModelSwitchingModalOpen]);

  if (!isModelSwitchingModalOpen) return null;

  const handleSelectModel = (model: AIModel) => {
    if (model.id !== activeModel.id) {
      setActiveModel(model);
      sendChatMessage(`[SYSTEM EVENT: Switched active model to ${model.name} (${model.provider}).]`);
    }
    setSelectedKeyProvider(model.providerKey);
    setKeyDraft(apiKeys[model.providerKey] || '');
    setTestState({ status: 'idle' });
  };

  const handleSaveKey = () => {
    setApiKey(selectedKeyProvider, keyDraft);
    setTestState({
      status: 'ok',
      message: keyDraft.trim() ? 'API key saved locally in browser storage.' : 'API key cleared.',
    });
  };

  const handleTestConnection = async () => {
    const modelForProvider =
      activeModel.providerKey === selectedKeyProvider
        ? activeModel
        : allModels.find((m) => m.providerKey === selectedKeyProvider) || activeModel;

    const keyToUse = keyDraft.trim() || apiKeys[selectedKeyProvider] || '';
    if (modelForProvider.requiresApiKey !== false && !keyToUse) {
      setTestState({ status: 'error', message: `Enter an API key for ${modelForProvider.provider} first.` });
      return;
    }

    // Save the draft key so the user can immediately use it
    if (keyDraft.trim()) {
      setApiKey(selectedKeyProvider, keyDraft.trim());
    }

    setTestState({ status: 'testing', message: `Testing ${modelForProvider.name}…` });
    const res = await sendModelRequest({
      model: modelForProvider,
      apiKey: keyToUse,
      messages: [{ sender: 'user', content: 'Reply with strictly the word: OK' }],
      systemPrompt: 'You are a connection verifier. Reply with OK.',
      temperature: 0,
    });

    if (res.success) {
      setTestState({
        status: 'ok',
        message: `Connected to ${modelForProvider.name}. Reply: "${(res.content || 'OK').slice(0, 40)}"`,
      });
    } else {
      setTestState({
        status: 'error',
        message: res.error || 'Connection test failed.',
      });
    }
  };

  const handleSyncLiveModels = async () => {
    const templateModel =
      activeModel.providerKey === selectedKeyProvider
        ? activeModel
        : allModels.find((m) => m.providerKey === selectedKeyProvider) || activeModel;

    const keyToUse = keyDraft.trim() || apiKeys[selectedKeyProvider] || '';
    if (templateModel.requiresApiKey !== false && !keyToUse) {
      setTestState({ status: 'error', message: `Enter an API key for ${templateModel.provider} first.` });
      return;
    }

    if (keyDraft.trim()) {
      setApiKey(selectedKeyProvider, keyDraft.trim());
    }

    setTestState({ status: 'testing', message: `Fetching available ${templateModel.provider} models…` });
    const res = await fetchAvailableProviderModels({
      format: templateModel.apiFormat,
      baseUrl: templateModel.baseUrl,
      apiKey: keyToUse,
    });

    if (!res.success || !res.models || res.models.length === 0) {
      setTestState({
        status: 'error',
        message: res.error || `No models returned by ${templateModel.provider}.`,
      });
      return;
    }

    const existingModelIds = new Set(allModels.map((m) => m.modelId));
    let added = 0;
    for (const m of res.models.slice(0, 12)) {
      if (!existingModelIds.has(m.modelId)) {
        addCustomModel({
          name: m.name,
          modelId: m.modelId,
          provider: templateModel.provider,
          providerKey: templateModel.providerKey,
          apiFormat: templateModel.apiFormat,
          baseUrl: templateModel.baseUrl,
          requiresApiKey: templateModel.requiresApiKey,
          version: m.modelId,
          badge: 'Synced from API',
          contextWindow: m.contextWindow || '1M',
          costPer1k: 'Provider',
          description: m.description || `Live model synced from ${templateModel.provider} API`,
        }, false);
        added++;
      }
    }

    setTestState({
      status: 'ok',
      message: `Found ${res.models.length} live ${templateModel.provider} model(s)${added > 0 ? ` — added ${added} new model(s) to list!` : ' (all listed).' }`,
    });
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customModelId.trim()) {
      setCustomError('Model ID is required (e.g. gemini-2.5-pro or llama-3.3-70b-versatile).');
      return;
    }
    if (!customBaseUrl.trim() && customFormat !== 'gemini') {
      setCustomError('Base URL is required.');
      return;
    }

    const displayName = customName.trim() || customModelId.trim();
    const providerLabel = customProvider.trim() || 'Custom';

    addCustomModel({
      name: displayName,
      modelId: customModelId.trim(),
      provider: providerLabel,
      providerKey:
        customProviderKey.trim() ||
        `custom-${providerLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      apiFormat: customFormat,
      baseUrl: customBaseUrl.trim() || 'https://generativelanguage.googleapis.com/v1beta',
      requiresApiKey: customRequiresKey,
      version: customModelId.trim(),
      badge: 'Custom Integration',
      contextWindow: customContextWindow.trim() || '128k',
      costPer1k: 'Custom',
      description: `Custom ${customFormat.toUpperCase()} endpoint (${customBaseUrl.trim()})`,
      apiKey: customApiKey.trim(),
    });

    setCustomName('');
    setCustomModelId('');
    setCustomApiKey('');
    setTab('models');
  };

  // Unique provider keys for the API Keys panel
  const uniqueProviders = Array.from(
    new Map(
      allModels.map((m) => [
        m.providerKey,
        { providerKey: m.providerKey, providerName: m.provider, requiresApiKey: m.requiresApiKey !== false },
      ])
    ).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={() => setIsModelSwitchingModalOpen(false)}>
      <section
        className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-ide-border-strong bg-ide-panel rounded-ide-panel shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-switcher-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ide-border px-4 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ide-cyan" aria-hidden="true" />
              <h2 id="model-switcher-title" className="text-sm font-semibold text-ide-strong">
                AI Model Gateway & Custom Providers
              </h2>
              <span className="font-mono text-[10px] text-ide-emerald">Active: {activeModel.name}</span>
            </div>
            <p className="mt-1 text-xs text-ide-muted">
              Select Gemini, Claude, GPT-4o, DeepSeek, or add any custom provider / model with your API key.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModelSwitchingModalOpen(false)}
            className="ide-focus-ring flex h-8 w-8 items-center justify-center rounded-ide-control text-ide-muted hover:bg-ide-hover hover:text-ide-text"
            aria-label="Close model gateway"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-ide-border bg-ide-surface px-4">
          <button
            type="button"
            onClick={() => setTab('models')}
            className={`ide-focus-ring border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === 'models' ? 'border-ide-focus text-ide-strong' : 'border-transparent text-ide-muted hover:text-ide-text'
            }`}
          >
            Models & API Keys ({allModels.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`ide-focus-ring flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === 'custom' ? 'border-ide-focus text-ide-strong' : 'border-transparent text-ide-muted hover:text-ide-text'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-ide-cyan" />
            Add Custom Model / Provider
          </button>
          <div className="ml-auto hidden items-center gap-2 font-mono text-[10px] text-ide-subtle sm:flex">
            <Database className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
            <span>AST: {masterPrompt.astVersion || 'Ready'}</span>
          </div>
        </div>

        {tab === 'models' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Model List */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {allModels.map((model) => {
                const isSelected = model.id === activeModel.id;
                const hasKey = Boolean(apiKeys[model.providerKey]);
                const needsKey = model.requiresApiKey !== false;

                return (
                  <div
                    key={model.id}
                    className={`flex w-full items-start gap-3 border-b border-ide-border px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-ide-selected' : 'hover:bg-ide-hover'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectModel(model)}
                      className="ide-focus-ring flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-pressed={isSelected}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ide-control border border-ide-border-strong bg-ide-card font-mono text-[10px] font-semibold text-ide-cyan">
                        {model.name.substring(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-semibold text-ide-strong">{model.name}</span>
                          <span className="font-mono text-[10px] text-ide-subtle">{model.provider}</span>
                          <span className="font-mono text-[10px] text-ide-cyan">{model.badge}</span>
                          {needsKey ? (
                            hasKey ? (
                              <span className="rounded border border-ide-emerald/40 bg-ide-emerald/10 px-1.5 py-0.2 font-mono text-[9px] text-ide-emerald">
                                Key Ready
                              </span>
                            ) : (
                              <span className="rounded border border-ide-amber/40 bg-ide-amber/10 px-1.5 py-0.2 font-mono text-[9px] text-ide-amber">
                                API Key Needed
                              </span>
                            )
                          ) : (
                            <span className="rounded border border-ide-border px-1.5 py-0.2 font-mono text-[9px] text-ide-subtle">
                              No Key Required
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-ide-muted">{model.description}</span>
                        <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-ide-subtle">
                          <span>ID: {model.modelId}</span>
                          <span>Context: {model.contextWindow}</span>
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {model.isCustom && (
                        <button
                          type="button"
                          onClick={() => removeCustomModel(model.id)}
                          className="ide-focus-ring flex h-6 w-6 items-center justify-center rounded-ide-control text-ide-subtle hover:bg-ide-hover hover:text-ide-rose"
                          title="Remove custom model"
                          aria-label={`Remove ${model.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectModel(model)}
                        className={`flex h-6 w-6 items-center justify-center rounded-ide-control border ${
                          isSelected
                            ? 'border-ide-emerald bg-ide-emerald text-ide-shell'
                            : 'border-ide-border-strong text-transparent hover:border-ide-focus'
                        }`}
                        aria-label={isSelected ? 'Selected model' : 'Select model'}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* API Key Configuration Bar */}
            <div className="shrink-0 border-t border-ide-border bg-ide-surface p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
                  <KeyRound className="h-3.5 w-3.5 text-ide-amber" aria-hidden="true" />
                  <span>Provider API Key Configuration</span>
                </div>
                <select
                  value={selectedKeyProvider}
                  onChange={(e) => {
                    const pKey = e.target.value;
                    setSelectedKeyProvider(pKey);
                    setKeyDraft(apiKeys[pKey] || '');
                    setTestState({ status: 'idle' });
                  }}
                  aria-label="Select provider for API key"
                  className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-bg px-2.5 py-1 font-mono text-[11px] text-ide-text outline-none"
                >
                  {uniqueProviders.map((p) => (
                    <option key={p.providerKey} value={p.providerKey}>
                      {p.providerName} {apiKeys[p.providerKey] ? '(Configured)' : '(Not Set)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex min-w-[220px] flex-1 items-center rounded-ide-control border border-ide-border-strong bg-ide-bg">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder={`Paste API key for ${selectedKeyProvider} (stored locally)…`}
                    className="min-w-0 flex-1 bg-transparent px-3 py-1.5 font-mono text-xs text-ide-strong outline-none placeholder:text-ide-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="px-2 text-ide-subtle hover:text-ide-text"
                    title={showKey ? 'Hide key' : 'Show key'}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="ide-focus-ring rounded-ide-control bg-ide-focus px-3 py-1.5 text-xs font-semibold text-white hover:bg-ide-focus/90"
                >
                  Save Key
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testState.status === 'testing'}
                  className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-card px-3 py-1.5 text-xs font-medium text-ide-text hover:bg-ide-hover disabled:opacity-50"
                >
                  {testState.status === 'testing' ? 'Working…' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleSyncLiveModels}
                  disabled={testState.status === 'testing'}
                  className="ide-focus-ring rounded-ide-control border border-ide-cyan/40 bg-ide-cyan/10 px-3 py-1.5 text-xs font-medium text-ide-cyan hover:bg-ide-cyan/20 disabled:opacity-50"
                  title="Fetch live models supported by your API key"
                >
                  Sync Live Models
                </button>
              </div>

              {testState.status !== 'idle' && (
                <div
                  className={`flex items-center gap-2 font-mono text-[11px] ${
                    testState.status === 'ok'
                      ? 'text-ide-emerald'
                      : testState.status === 'error'
                        ? 'text-ide-rose'
                        : 'text-ide-muted'
                  }`}
                >
                  {testState.status === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                  {testState.status === 'ok' && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span>{testState.message}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Add Custom Model / Provider Tab */
          <form onSubmit={handleAddCustomModel} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ide-muted">Quick Provider Presets</div>
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCustomProvider(preset.provider);
                      setCustomProviderKey(preset.providerKey);
                      setCustomFormat(preset.apiFormat);
                      setCustomBaseUrl(preset.baseUrl);
                      setCustomModelId(preset.exampleModel);
                      setCustomRequiresKey(preset.requiresApiKey);
                      if (!customName) setCustomName(preset.exampleModel);
                    }}
                    className="ide-focus-ring rounded-ide-control border border-ide-border bg-ide-surface px-2.5 py-1 text-[11px] text-ide-text hover:bg-ide-hover"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {customError && (
              <div className="flex items-center gap-2 rounded-ide-control border border-ide-rose/40 bg-ide-rose/10 px-3 py-2 text-xs text-ide-rose">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{customError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">Display Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Gemini 2.5 Flash Exp / Groq Llama 3.3"
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 text-xs text-ide-strong outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">Provider Name</label>
                <input
                  type="text"
                  value={customProvider}
                  onChange={(e) => setCustomProvider(e.target.value)}
                  placeholder="e.g. Google, Groq, OpenRouter, Ollama"
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 text-xs text-ide-strong outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">API Format *</label>
                <select
                  value={customFormat}
                  onChange={(e) => setCustomFormat(e.target.value as AIProviderFormat)}
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 text-xs text-ide-strong outline-none"
                >
                  <option value="openai">OpenAI-Compatible (/v1/chat/completions)</option>
                  <option value="gemini">Google Gemini (generateContent)</option>
                  <option value="anthropic">Anthropic Messages (/v1/messages)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">Exact Model ID *</label>
                <input
                  type="text"
                  required
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash, llama-3.3-70b-versatile"
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">API Base URL</label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-ide-muted">Context Window</label>
                <input
                  type="text"
                  value={customContextWindow}
                  onChange={(e) => setCustomContextWindow(e.target.value)}
                  placeholder="128k"
                  className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                />
              </div>

              <div className="flex items-end pb-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ide-text">
                  <input
                    type="checkbox"
                    checked={customRequiresKey}
                    onChange={(e) => setCustomRequiresKey(e.target.checked)}
                    className="rounded border-ide-border bg-ide-bg text-ide-focus"
                  />
                  <span>Requires API Key (uncheck for local Ollama)</span>
                </label>
              </div>

              {customRequiresKey && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-ide-muted">
                    API Key (optional now — you can add or update it later)
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="sk-... or AIza..."
                    className="ide-focus-ring w-full rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-ide-border pt-3">
              <button
                type="button"
                onClick={() => setTab('models')}
                className="ide-focus-ring rounded-ide-control border border-ide-border px-3 py-1.5 text-xs text-ide-muted hover:text-ide-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ide-focus-ring rounded-ide-control bg-ide-focus px-4 py-1.5 text-xs font-semibold text-white hover:bg-ide-focus/90"
              >
                Add & Select Model
              </button>
            </div>
          </form>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-ide-border px-4 py-2.5 font-mono text-[10px] text-ide-subtle">
          <span>API keys are stored only in your local browser storage.</span>
          <button
            type="button"
            onClick={() => setIsModelSwitchingModalOpen(false)}
            className="ide-focus-ring rounded-ide-control border border-ide-border-strong px-3 py-1 text-ide-text hover:bg-ide-hover"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
};
