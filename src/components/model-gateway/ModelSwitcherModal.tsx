import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import {
  fetchAvailableProviderModels,
  testProviderConnection,
} from '../../utils/aiService';
import type { AIModel, AIProviderFormat } from '../../types/ide';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Divider,
  IconButton,
  Input,
  NotificationBanner,
  Select,
  Tabs,
} from '../ui';

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
    label: 'OpenAI',
    provider: 'OpenAI',
    providerKey: 'openai',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    exampleModel: 'gpt-4o',
    requiresApiKey: true,
  },
  {
    label: 'Anthropic',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    apiFormat: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    exampleModel: 'claude-3-7-sonnet-latest',
    requiresApiKey: true,
  },
  {
    label: 'DeepSeek',
    provider: 'DeepSeek',
    providerKey: 'deepseek',
    apiFormat: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    exampleModel: 'deepseek-chat',
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
    configuredProviders,
    providerStatuses,
    refreshAiKeyStatuses,
    setApiKey,
  } = useIDE();

  const [tab, setTab] = useState<'picker' | 'providers'>('picker');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeyProvider, setSelectedKeyProvider] = useState<string>(activeModel.providerKey);
  const [keyDraft, setKeyDraft] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
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
  const [customRequiresKey, setCustomRequiresKey] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (isModelSwitchingModalOpen) {
      setSelectedKeyProvider(activeModel.providerKey);
      setKeyDraft('');
      setSearchQuery('');
      setTestState({ status: 'idle' });
      setCustomError(null);
      refreshAiKeyStatuses();
    }
  }, [isModelSwitchingModalOpen, activeModel.providerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allModels;
    return allModels.filter(
      (m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
    );
  }, [allModels, searchQuery]);

  const uniqueProviders = useMemo(
    () =>
      Array.from(
        new Map(
          allModels.map((m) => [
            m.providerKey,
            { providerKey: m.providerKey, providerName: m.provider, requiresApiKey: m.requiresApiKey !== false },
          ])
        ).values()
      ),
    [allModels]
  );

  const handleSelectModel = (model: AIModel) => {
    setActiveModel(model);
    setSelectedKeyProvider(model.providerKey);
    setIsModelSwitchingModalOpen(false);
  };

  const handleSaveKey = async () => {
    await setApiKey(selectedKeyProvider, keyDraft);
    setKeyDraft('');
    setTestState({
      status: 'ok',
      message: keyDraft.trim() ? 'API key saved for this session.' : 'API key removed.',
    });
  };

  const handleTestConnection = async () => {
    const modelForProvider =
      activeModel.providerKey === selectedKeyProvider
        ? activeModel
        : allModels.find((m) => m.providerKey === selectedKeyProvider) || activeModel;

    const draft = keyDraft.trim();
    const hasConfigured = Boolean(configuredProviders[selectedKeyProvider]);
    if (modelForProvider.requiresApiKey !== false && !draft && !hasConfigured) {
      setTestState({ status: 'error', message: `Enter an API key for ${modelForProvider.provider} first.` });
      return;
    }

    if (draft) {
      await setApiKey(selectedKeyProvider, draft);
      setKeyDraft('');
    }

    setTestState({ status: 'testing', message: `Testing ${modelForProvider.provider}…` });
    const res = await testProviderConnection({
      providerKey: selectedKeyProvider,
      format: modelForProvider.apiFormat,
      baseUrl: modelForProvider.baseUrl,
      modelId: modelForProvider.modelId,
      ...(draft ? { apiKey: draft } : {}),
    });
    await refreshAiKeyStatuses();

    setTestState(
      res.success
        ? { status: 'ok', message: `Connected to ${modelForProvider.provider}.` }
        : { status: 'error', message: res.error || 'Connection failed.' }
    );
  };

  const handleSyncLiveModels = async () => {
    const templateModel =
      activeModel.providerKey === selectedKeyProvider
        ? activeModel
        : allModels.find((m) => m.providerKey === selectedKeyProvider) || activeModel;

    const draft = keyDraft.trim();
    const hasConfigured = Boolean(configuredProviders[selectedKeyProvider]);
    if (templateModel.requiresApiKey !== false && !draft && !hasConfigured) {
      setTestState({ status: 'error', message: `Enter an API key for ${templateModel.provider} first.` });
      return;
    }

    if (draft) {
      await setApiKey(selectedKeyProvider, draft);
      setKeyDraft('');
    }

    setTestState({ status: 'testing', message: `Refreshing models from ${templateModel.provider}…` });
    const res = await fetchAvailableProviderModels({
      format: templateModel.apiFormat,
      baseUrl: templateModel.baseUrl,
      providerKey: selectedKeyProvider,
      ...(draft ? { apiKey: draft } : {}),
    });
    await refreshAiKeyStatuses();

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
        addCustomModel(
          {
            name: m.name,
            modelId: m.modelId,
            provider: templateModel.provider,
            providerKey: templateModel.providerKey,
            apiFormat: templateModel.apiFormat,
            baseUrl: templateModel.baseUrl,
            requiresApiKey: templateModel.requiresApiKey,
            version: m.modelId,
            badge: 'Synced',
            contextWindow: m.contextWindow || 'Provider',
            costPer1k: 'Provider',
            description: m.description || `Model from ${templateModel.provider}`,
          },
          false
        );
        added += 1;
      }
    }

    setTestState({
      status: 'ok',
      message: `Found ${res.models.length} model(s)${added > 0 ? ` (${added} added)` : ''}.`,
    });
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customModelId.trim()) {
      setCustomError('Model ID is required.');
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
      badge: 'Custom',
      contextWindow: 'Custom',
      costPer1k: 'Custom',
      description: `Custom ${customFormat} endpoint`,
      apiKey: customApiKey.trim(),
    });

    setCustomName('');
    setCustomModelId('');
    setCustomApiKey('');
    setShowCustomForm(false);
    setTab('picker');
  };

  const selectedProviderMeta = uniqueProviders.find((p) => p.providerKey === selectedKeyProvider);
  const selectedProviderConfigured = Boolean(configuredProviders[selectedKeyProvider]);
  const selectedProviderStatus =
    providerStatuses[selectedKeyProvider] || (selectedProviderConfigured ? 'configured' : 'disconnected');

  return (
    <Dialog
      open={isModelSwitchingModalOpen}
      onClose={() => setIsModelSwitchingModalOpen(false)}
      title="AI models"
      description="Choose an active model or configure provider credentials."
      size="lg"
    >
      <div className="space-y-4">
        <Tabs
          ariaLabel="AI model sections"
          activeId={tab}
          onChange={(id) => setTab(id as 'picker' | 'providers')}
          items={[
            { id: 'picker', label: 'Select model' },
            { id: 'providers', label: 'Provider settings' },
          ]}
        />

        {tab === 'picker' ? (
          <div className="space-y-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models or providers…"
              aria-label="Search models"
              leftAdornment={<Search className="h-4 w-4" />}
            />

            <div className="max-h-72 overflow-y-auto divide-y divide-ide-border rounded-ide-control border border-ide-border bg-ide-bg">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-ide-muted">
                  No models match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredModels.map((model) => {
                  const isSelected = model.id === activeModel.id;
                  const configured = model.requiresApiKey === false || Boolean(configuredProviders[model.providerKey]);
                  const status = providerStatuses[model.providerKey];
                  const availabilityLabel =
                    model.requiresApiKey === false
                      ? 'Local'
                      : status === 'connected'
                        ? 'Connected'
                        : configured
                          ? 'Configured'
                          : 'Needs key';

                  return (
                    <div
                      key={model.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 transition-colors ${
                        isSelected ? 'bg-ide-selected' : 'hover:bg-ide-hover'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectModel(model)}
                        className="ide-focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-sans text-[13px] font-medium text-ide-strong">
                            {model.name}
                          </div>
                          <div className="truncate font-sans text-[12px] text-ide-muted">
                            {model.provider}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={
                              availabilityLabel === 'Connected'
                                ? 'success'
                                : availabilityLabel === 'Needs key'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {availabilityLabel}
                          </Badge>
                          {isSelected && <Check className="h-4 w-4 text-ide-focus" aria-hidden="true" />}
                        </div>
                      </button>
                      {model.isCustom && (
                        <IconButton
                          size="sm"
                          variant="danger"
                          label={`Remove ${model.name}`}
                          onClick={() => removeCustomModel(model.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-ide-muted">
                Active: <span className="font-medium text-ide-strong">{activeModel.name}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => setTab('providers')}>
                Manage providers
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Provider"
                value={selectedKeyProvider}
                onChange={(e) => {
                  setSelectedKeyProvider(e.target.value);
                  setKeyDraft('');
                  setTestState({ status: 'idle' });
                }}
                options={uniqueProviders.map((p) => ({
                  value: p.providerKey,
                  label: p.providerName,
                }))}
              />
              <div className="flex flex-col justify-end pb-1">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-ide-muted">Status:</span>
                  {testState.status === 'testing' ? (
                    <Badge variant="accent">Testing…</Badge>
                  ) : selectedProviderStatus === 'connected' ? (
                    <Badge variant="success">Connected</Badge>
                  ) : selectedProviderStatus === 'error' ? (
                    <Badge variant="error">Connection failed</Badge>
                  ) : selectedProviderMeta?.requiresApiKey === false ? (
                    <Badge variant="neutral">Local endpoint</Badge>
                  ) : selectedProviderConfigured ? (
                    <Badge variant="neutral">Configured</Badge>
                  ) : (
                    <Badge variant="warning">Not configured</Badge>
                  )}
                </div>
              </div>
            </div>

            {selectedProviderMeta?.requiresApiKey !== false && (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="API key (stored in local backend session)"
                    type={showKey ? 'text' : 'password'}
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder={selectedProviderConfigured ? 'Saved (enter new key to replace)' : 'Enter API key…'}
                    rightAdornment={
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="text-ide-subtle hover:text-ide-text"
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>
                <Button variant="primary" onClick={handleSaveKey} disabled={!keyDraft.trim()}>
                  Save key
                </Button>
                {selectedProviderConfigured && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await setApiKey(selectedKeyProvider, '');
                      setTestState({ status: 'ok', message: 'API key removed.' });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={handleTestConnection} disabled={testState.status === 'testing'}>
                Test connection
              </Button>
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={handleSyncLiveModels}
                disabled={testState.status === 'testing'}
              >
                Refresh models
              </Button>
            </div>

            {testState.message && (
              <NotificationBanner
                variant={testState.status === 'error' ? 'error' : testState.status === 'ok' ? 'success' : 'info'}
                message={testState.message}
              />
            )}

            <Divider />

            {/* Progressive disclosure: Custom / OpenAI-compatible provider */}
            <div className="rounded-ide-control border border-ide-border bg-ide-surface">
              <button
                type="button"
                onClick={() => setShowCustomForm((v) => !v)}
                className="ide-focus-ring flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-ide-text hover:bg-ide-hover"
              >
                <span className="flex items-center gap-2">
                  {showCustomForm ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Add custom model or OpenAI-compatible endpoint
                </span>
                <Plus className="h-4 w-4 text-ide-subtle" aria-hidden="true" />
              </button>

              {showCustomForm && (
                <form onSubmit={handleAddCustomModel} className="border-t border-ide-border p-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PROVIDER_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCustomProvider(p.provider);
                          setCustomProviderKey(p.providerKey);
                          setCustomFormat(p.apiFormat);
                          setCustomBaseUrl(p.baseUrl);
                          setCustomModelId(p.exampleModel);
                          setCustomRequiresKey(p.requiresApiKey);
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Model ID"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder="gpt-4o or qwen2.5-coder:7b"
                    />
                    <Input
                      label="Display name (optional)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="My Custom Model"
                    />
                    <Select
                      label="API format"
                      value={customFormat}
                      onChange={(e) => setCustomFormat(e.target.value as AIProviderFormat)}
                      options={[
                        { value: 'openai', label: 'OpenAI-compatible' },
                        { value: 'gemini', label: 'Google Gemini' },
                        { value: 'anthropic', label: 'Anthropic Claude' },
                      ]}
                    />
                    <Input
                      label="Base URL"
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>

                  <Checkbox
                    label="Requires API key"
                    checked={customRequiresKey}
                    onChange={(e) => setCustomRequiresKey(e.target.checked)}
                  />

                  {customRequiresKey && (
                    <Input
                      label="API key (optional)"
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  )}

                  {customError && <NotificationBanner variant="error" message={customError} />}

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary">
                      Add model
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
