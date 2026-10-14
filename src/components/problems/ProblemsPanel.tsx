import React, { useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode,
  Filter,
  Info,
  Maximize2,
  Minimize2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { WorkspaceDiagnostic, DiagnosticSeverity, DiagnosticSource } from '../../types/ide';
import {
  LANGUAGE_PROVIDERS,
  getLanguageProviderForFile,
  TS_COMPILER_SCOPE_INFO,
} from '../../utils/diagnosticsEngine';

export const ProblemsPanel: React.FC = () => {
  const {
    diagnostics,
    diagnosticsSummary,
    unsupportedFiles,
    files,
    activeFileId,
    openFile,
    setTargetEditorLine,
    revealFileInExplorer,
    setActiveView,
    setIsProblemsPanelOpen,
  } = useIDE();

  // Panel sizing & state
  const [panelHeight, setPanelHeight] = useState(240);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(240);

  // Active view tab: 'problems' or 'providers'
  const [activeTab, setActiveTab] = useState<'problems' | 'providers'>('problems');

  // Filtering states
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [filterText, setFilterText] = useState('');
  const [currentFileOnly, setCurrentFileOnly] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [showScopeInfo, setShowScopeInfo] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId);
  const activeFileProvider = activeFile ? getLanguageProviderForFile(activeFile.name) : undefined;
  const isActiveFileUnsupported = activeFile && (!activeFileProvider || activeFileProvider.status === 'unsupported');

  // Resize drag handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingHeight(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHeight) return;
    const dy = dragStartYRef.current - e.clientY;
    const newHeight = Math.min(520, Math.max(140, startHeightRef.current + dy));
    setPanelHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingHeight) {
      setIsDraggingHeight(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Filter diagnostics based on severity, source, currentFileOnly, and search query
  const filteredDiagnostics = useMemo(() => {
    return diagnostics.filter((diag) => {
      // 1. Current file only filter
      if (currentFileOnly && activeFile && diag.fileId !== activeFile.id) {
        return false;
      }

      // 2. Severity filter
      if (severityFilter !== 'all' && diag.severity !== severityFilter) {
        return false;
      }

      // 3. Source filter
      if (sourceFilter !== 'all' && diag.source !== sourceFilter) {
        return false;
      }

      // 4. Search query filter
      if (filterText.trim()) {
        const q = filterText.toLowerCase();
        const matches =
          diag.message.toLowerCase().includes(q) ||
          diag.filePath.toLowerCase().includes(q) ||
          diag.fileName.toLowerCase().includes(q) ||
          (diag.code && String(diag.code).toLowerCase().includes(q)) ||
          diag.source.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [diagnostics, severityFilter, sourceFilter, filterText, currentFileOnly, activeFile]);

  // Group diagnostics by file
  const groupedByFile = useMemo(() => {
    const groups = new Map<string, { fileId: string; filePath: string; fileName: string; items: WorkspaceDiagnostic[] }>();

    filteredDiagnostics.forEach((diag) => {
      let group = groups.get(diag.filePath);
      if (!group) {
        group = {
          fileId: diag.fileId,
          filePath: diag.filePath,
          fileName: diag.fileName,
          items: [],
        };
        groups.set(diag.filePath, group);
      }
      group.items.push(diag);
    });

    return Array.from(groups.values());
  }, [filteredDiagnostics]);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedFiles(new Set(groupedByFile.map((g) => g.filePath)));
  };

  const expandAll = () => {
    setCollapsedFiles(new Set());
  };

  const handleDiagnosticClick = (diag: WorkspaceDiagnostic) => {
    openFile(diag.fileId);
    setTargetEditorLine(diag.line);
    revealFileInExplorer(diag.fileId);
    setActiveView('editor');
  };

  const severityIcon = (severity: DiagnosticSeverity) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-3.5 w-3.5 shrink-0 text-ide-rose" aria-label="Error" />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-ide-amber" aria-label="Warning" />;
      case 'info':
      case 'hint':
      default:
        return <Info className="h-3.5 w-3.5 shrink-0 text-ide-focus" aria-label="Info" />;
    }
  };

  const sourceBadgeColor = (source: DiagnosticSource) => {
    switch (source) {
      case 'typescript':
        return 'border-ide-cyan/30 bg-ide-cyan/15 text-ide-cyan';
      case 'json':
        return 'border-ide-amber/30 bg-ide-amber/15 text-ide-amber';
      case 'html':
        return 'border-ide-rose/30 bg-ide-rose/15 text-ide-rose';
      case 'css':
        return 'border-ide-purple/30 bg-ide-purple/15 text-ide-purple';
      case 'markdown':
        return 'border-ide-emerald/30 bg-ide-emerald/15 text-ide-emerald';
      case 'python':
        return 'border-ide-focus/30 bg-ide-focus/15 text-ide-focus';
      case 'c':
        return 'border-ide-cyan/40 bg-ide-cyan/20 text-ide-cyan';
      default:
        return 'border-ide-border bg-ide-card text-ide-muted';
    }
  };

  // Distinct sources present in current diagnostics
  const presentSources = useMemo(() => {
    const s = new Set<string>();
    diagnostics.forEach((d) => s.add(d.source));
    return Array.from(s);
  }, [diagnostics]);

  return (
    <aside
      className="relative flex flex-col border-t border-ide-border bg-ide-panel select-none transition-all duration-150 z-20"
      style={{ height: isMaximized ? '70%' : `${panelHeight}px` }}
      data-purpose="problems-and-diagnostics-panel"
      aria-label="Problems and Diagnostics Panel"
    >
      {/* Top resize handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute -top-1.5 inset-x-0 h-3 cursor-ns-resize hover:bg-ide-focus/40 z-30 transition-colors"
        title="Drag to resize problems panel"
      />

      {/* Panel Header & Navigation Controls */}
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-ide-border bg-ide-shell px-3 text-[11px]">
        {/* Left: Tab Title & Counts */}
        <div className="flex items-center gap-3">
          {/* Main Tab Toggle: Problems vs Providers */}
          <div className="flex items-center gap-1 border-r border-ide-border pr-2">
            <button
              type="button"
              onClick={() => setActiveTab('problems')}
              className={`ide-focus-ring flex items-center gap-1.5 px-2 py-1 font-semibold uppercase tracking-wide rounded-ide-control transition-colors ${
                activeTab === 'problems'
                  ? 'bg-ide-surface text-ide-strong'
                  : 'text-ide-muted hover:text-ide-text'
              }`}
            >
              <span>Problems</span>
              <span
                className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                  diagnosticsSummary.errorCount > 0
                    ? 'bg-ide-rose/20 text-ide-rose border border-ide-rose/30'
                    : diagnosticsSummary.warningCount > 0
                      ? 'bg-ide-amber/20 text-ide-amber border border-ide-amber/30'
                      : 'bg-ide-surface text-ide-muted border border-ide-border'
                }`}
              >
                {diagnostics.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('providers')}
              className={`ide-focus-ring flex items-center gap-1.5 px-2 py-1 font-semibold uppercase tracking-wide rounded-ide-control transition-colors ${
                activeTab === 'providers'
                  ? 'bg-ide-surface text-ide-strong'
                  : 'text-ide-muted hover:text-ide-text'
              }`}
              title="View language checkers and supported formats"
            >
              <span>Checkers</span>
              <span className="font-mono text-[10px] text-ide-subtle">
                {diagnosticsSummary.checkedFilesCount}/{files.length}
              </span>
            </button>
          </div>

          {activeTab === 'problems' && (
            <>
              {/* Severity filter tabs */}
              <div className="flex items-center gap-1" role="tablist" aria-label="Problem severity filters">
                <button
                  type="button"
                  onClick={() => setSeverityFilter('all')}
                  className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-0.5 transition-colors ${
                    severityFilter === 'all'
                      ? 'bg-ide-selected font-semibold text-ide-strong'
                      : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                  }`}
                  title="Show all diagnostics"
                >
                  <span>All</span>
                  <span className="font-mono text-[10px] text-ide-subtle">{diagnostics.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverityFilter('error')}
                  className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-0.5 transition-colors ${
                    severityFilter === 'error'
                      ? 'bg-ide-rose/15 font-semibold text-ide-rose border border-ide-rose/30'
                      : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                  }`}
                  title="Show errors only"
                >
                  <XCircle className="h-3 w-3 text-ide-rose" aria-hidden="true" />
                  <span>Errors</span>
                  <span className="font-mono text-[10px]">{diagnosticsSummary.errorCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverityFilter('warning')}
                  className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-0.5 transition-colors ${
                    severityFilter === 'warning'
                      ? 'bg-ide-amber/15 font-semibold text-ide-amber border border-ide-amber/30'
                      : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                  }`}
                  title="Show warnings only"
                >
                  <AlertTriangle className="h-3 w-3 text-ide-amber" aria-hidden="true" />
                  <span>Warnings</span>
                  <span className="font-mono text-[10px]">{diagnosticsSummary.warningCount}</span>
                </button>

                {diagnosticsSummary.infoCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSeverityFilter('info')}
                    className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-0.5 transition-colors ${
                      severityFilter === 'info'
                        ? 'bg-ide-focus/15 font-semibold text-ide-focus border border-ide-focus/30'
                        : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                    }`}
                    title="Show info only"
                  >
                    <Info className="h-3 w-3 text-ide-focus" aria-hidden="true" />
                    <span>Info</span>
                    <span className="font-mono text-[10px]">{diagnosticsSummary.infoCount}</span>
                  </button>
                )}
              </div>

              {/* Source/Language filter dropdown if multiple sources exist */}
              {presentSources.length > 1 && (
                <div className="hidden lg:flex items-center gap-1 border-l border-ide-border pl-2">
                  <span className="text-[10px] text-ide-subtle uppercase">Lang:</span>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="ide-focus-ring rounded-ide-control border border-ide-border bg-ide-bg px-1.5 py-0.5 font-mono text-[10px] text-ide-text outline-none"
                  >
                    <option value="all">All Languages</option>
                    {presentSources.map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Search Filter, Scope toggle, and Window Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'problems' && (
            <>
              {/* Quick Filter Input */}
              <div className="relative hidden items-center sm:flex">
                <Filter className="absolute left-2 h-3 w-3 text-ide-subtle pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter (text, code, path)..."
                  className="ide-focus-ring h-6 w-44 rounded-ide-control border border-ide-border bg-ide-bg pl-7 pr-2 font-mono text-[11px] text-ide-text placeholder:text-ide-subtle focus:border-ide-focus"
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText('')}
                    className="absolute right-1.5 text-ide-subtle hover:text-ide-text"
                    title="Clear filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Current file toggle */}
              <button
                type="button"
                onClick={() => setCurrentFileOnly(!currentFileOnly)}
                className={`ide-focus-ring hidden md:flex items-center gap-1 rounded-ide-control border px-2 py-0.5 text-[10px] transition-colors ${
                  currentFileOnly
                    ? 'border-ide-focus bg-ide-selected font-medium text-ide-focus'
                    : 'border-ide-border text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                }`}
                title={currentFileOnly ? 'Showing current file only (click for all files)' : 'Showing all files (click for current file only)'}
              >
                <span>Current File</span>
              </button>
            </>
          )}

          {/* Scope explanation button */}
          <button
            type="button"
            onClick={() => setShowScopeInfo(!showScopeInfo)}
            className={`ide-focus-ring flex items-center gap-1 rounded-ide-control border px-2 py-0.5 text-[10px] transition-colors ${
              showScopeInfo
                ? 'border-ide-focus bg-ide-selected text-ide-cyan'
                : 'border-ide-border text-ide-subtle hover:bg-ide-hover hover:text-ide-text'
            }`}
            title="Diagnostics Capabilities & Scope"
            aria-expanded={showScopeInfo}
          >
            <Sparkles className="h-3 w-3 text-ide-cyan" aria-hidden="true" />
            <span className="hidden lg:inline">Scope</span>
          </button>

          {activeTab === 'problems' && (
            /* Expand / Collapse All */
            <div className="flex items-center border-l border-ide-border pl-2">
              <button
                type="button"
                onClick={collapseAll}
                className="ide-focus-ring p-1 text-ide-muted hover:text-ide-text rounded-ide-control"
                title="Collapse all file groups"
              >
                <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={expandAll}
                className="ide-focus-ring p-1 text-ide-muted hover:text-ide-text rounded-ide-control"
                title="Expand all file groups"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Maximize / Restore */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="ide-focus-ring p-1 text-ide-muted hover:text-ide-text rounded-ide-control"
            title={isMaximized ? 'Restore panel height' : 'Maximize problems panel'}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Close Panel */}
          <button
            type="button"
            onClick={() => setIsProblemsPanelOpen(false)}
            className="ide-focus-ring p-1 text-ide-muted hover:text-ide-rose rounded-ide-control"
            title="Close Problems panel (Ctrl+Shift+M)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Honest Unsupported File Notification Banner (Requirement 5) */}
      {currentFileOnly && isActiveFileUnsupported && activeFile && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ide-amber/30 bg-ide-amber/10 px-4 py-2 text-[11px] text-ide-amber">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-ide-amber" aria-hidden="true" />
            <span>
              <strong>Diagnostics unavailable for {activeFile.name}:</strong> No syntax checker is configured for .{activeFile.name.split('.').pop()} files.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentFileOnly(false)}
            className="ide-focus-ring font-medium underline hover:text-ide-strong"
          >
            Show entire workspace
          </button>
        </div>
      )}

      {/* Scope Info Callout */}
      {showScopeInfo && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ide-border bg-ide-card px-4 py-2.5 text-[11px] text-ide-text">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />
            <div className="space-y-1">
              <div className="font-semibold text-ide-strong">{TS_COMPILER_SCOPE_INFO.title}</div>
              <p className="max-w-4xl text-ide-muted leading-relaxed">
                {TS_COMPILER_SCOPE_INFO.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowScopeInfo(false)}
            className="ide-focus-ring text-ide-subtle hover:text-ide-text"
            title="Dismiss scope info"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: Main Problems List */}
      {activeTab === 'problems' && (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden font-mono text-[11px]">
          {groupedByFile.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ide-muted">
              <CheckCircle2 className="h-8 w-8 text-ide-emerald/80 mb-2" aria-hidden="true" />
              <span className="font-sans text-sm font-medium text-ide-strong">
                {diagnostics.length === 0
                  ? 'No problems have been detected in the workspace.'
                  : 'No problems match the current filter.'}
              </span>
              <span className="mt-1 font-sans text-xs text-ide-subtle max-w-md">
                {diagnostics.length === 0
                  ? `Checked ${diagnosticsSummary.checkedFilesCount} workspace file(s) across TypeScript, JSON, HTML, CSS, Markdown, Python, and C.${
                      unsupportedFiles.length > 0
                        ? ` Note: ${unsupportedFiles.length} file(s) have no language checker configured.`
                        : ''
                    }`
                  : 'Try adjusting your severity, source filter, or search query.'}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-ide-border/40">
              {groupedByFile.map((group) => {
                const isCollapsed = collapsedFiles.has(group.filePath);
                const groupErrors = group.items.filter((i) => i.severity === 'error').length;
                const groupWarnings = group.items.filter((i) => i.severity === 'warning').length;

                return (
                  <div key={group.filePath} className="group/file">
                    {/* File Header */}
                    <div
                      onClick={() => toggleFileCollapse(group.filePath)}
                      className="flex cursor-pointer items-center justify-between bg-ide-surface/40 px-3 py-1.5 text-ide-strong hover:bg-ide-hover transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ide-subtle" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ide-subtle" />
                        )}
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-ide-cyan" aria-hidden="true" />
                        <span className="font-medium text-ide-text truncate">{group.filePath}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {groupErrors > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-ide-rose">
                            <XCircle className="h-3 w-3" />
                            <span>{groupErrors}</span>
                          </span>
                        )}
                        {groupWarnings > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-ide-amber">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{groupWarnings}</span>
                          </span>
                        )}
                        <span className="rounded bg-ide-card px-1.5 py-0.5 text-[10px] font-semibold text-ide-muted border border-ide-border">
                          {group.items.length}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostic Items in File */}
                    {!isCollapsed && (
                      <div className="divide-y divide-ide-border/20 bg-ide-bg/60">
                        {group.items.map((diag) => (
                          <div
                            key={diag.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleDiagnosticClick(diag)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleDiagnosticClick(diag);
                              }
                            }}
                            className="ide-focus-ring flex cursor-pointer items-start justify-between gap-4 px-4 py-1.5 hover:bg-ide-hover/70 transition-colors"
                            title={`Click to open ${diag.filePath} at line ${diag.line}, column ${diag.column}`}
                          >
                            {/* Left: Icon, Message, Rule Code, Source Badge */}
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className="mt-0.5">{severityIcon(diag.severity)}</span>
                              <div className="min-w-0">
                                <span className="text-ide-text leading-tight">{diag.message}</span>
                                {diag.code && (
                                  <span className="ml-2 inline-block rounded border border-ide-border bg-ide-card px-1 py-0.2 font-mono text-[9px] text-ide-muted">
                                    {diag.code}
                                  </span>
                                )}
                                <span
                                  className={`ml-1.5 inline-block rounded border px-1 py-0.2 font-mono text-[9px] uppercase font-medium ${sourceBadgeColor(
                                    diag.source
                                  )}`}
                                >
                                  {diag.source}
                                </span>
                              </div>
                            </div>

                            {/* Right: Line & Column Location */}
                            <div className="flex shrink-0 items-center gap-2 text-right text-ide-subtle">
                              <span className="font-mono text-[10px] text-ide-muted hover:text-ide-focus">
                                [{diag.line}, {diag.column}]
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Language Checkers & Provider Registry (Requirement 5) */}
      {activeTab === 'providers' && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[12px]">
          <div className="mb-4">
            <h3 className="font-semibold text-ide-strong text-sm">Language Diagnostics Providers</h3>
            <p className="text-xs text-ide-muted mt-0.5">
              Honest status of diagnostic syntax checkers available in this IntelliCode IDE runtime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {LANGUAGE_PROVIDERS.map((provider) => {
              const isActive = provider.status === 'active';
              return (
                <div
                  key={provider.id}
                  className="rounded-ide-panel border border-ide-border bg-ide-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ide-strong">{provider.language}</span>
                    <span
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                        isActive
                          ? 'border-ide-emerald/30 bg-ide-emerald/15 text-ide-emerald'
                          : 'border-ide-subtle/30 bg-ide-surface text-ide-subtle'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3 w-3" />
                          <span>No Checker</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-ide-cyan">{provider.name}</div>
                  <p className="text-[11px] text-ide-muted leading-relaxed">{provider.description}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {provider.extensions.map((ext) => (
                      <span
                        key={ext}
                        className="rounded border border-ide-border bg-ide-bg px-1.5 py-0.5 font-mono text-[10px] text-ide-subtle"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>

                  {provider.capabilities.length > 0 && (
                    <div className="border-t border-ide-border/50 pt-2 text-[10px] text-ide-subtle">
                      <span className="font-semibold text-ide-muted">Checks: </span>
                      {provider.capabilities.join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {unsupportedFiles.length > 0 && (
            <div className="mt-4 rounded-ide-panel border border-ide-amber/30 bg-ide-amber/10 p-3">
              <div className="flex items-center gap-2 font-semibold text-ide-amber text-xs">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  {unsupportedFiles.length} file(s) in workspace currently have no diagnostic checker:
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {unsupportedFiles.map((u) => (
                  <span
                    key={u.fileId}
                    className="font-mono text-[10px] rounded border border-ide-amber/40 bg-ide-panel px-2 py-0.5 text-ide-text"
                    title={u.reason}
                  >
                    {u.filePath} ({u.reason})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
