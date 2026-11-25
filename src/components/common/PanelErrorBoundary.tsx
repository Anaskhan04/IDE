import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface PanelErrorBoundaryProps {
  panelName: string;
  children: React.ReactNode;
  onReset?: () => void;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Isolates rendering errors to an individual IDE panel so workspace state and
 * unsaved editor content in IDEProvider remain intact.
 */
export class PanelErrorBoundary extends React.Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[PanelErrorBoundary:${this.props.panelName}]`, error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex h-full w-full items-center justify-center bg-ide-surface p-4 text-ide-text"
      >
        <div className="w-full max-w-md rounded-ide-panel border border-ide-border bg-ide-panel p-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-ide-control border border-ide-border bg-ide-surface p-2 text-ide-rose">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ide-text-title text-ide-text-strong">
                {this.props.panelName} encountered an error
              </h2>
              <p className="ide-text-body mt-1 text-ide-text-muted">
                Your workspace state and unsaved editor files are preserved. You can reload this panel to recover.
              </p>
              {this.state.error?.message && (
                <pre className="ide-text-meta mt-3 max-h-24 overflow-auto rounded-ide-control border border-ide-border bg-ide-bg p-2 font-mono text-ide-rose">
                  {this.state.error.message}
                </pre>
              )}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="ide-focus-ring inline-flex items-center gap-1.5 rounded-ide-control bg-ide-cyan px-3 py-1.5 text-xs font-medium text-ide-bg transition-opacity hover:opacity-90"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reload {this.props.panelName}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
