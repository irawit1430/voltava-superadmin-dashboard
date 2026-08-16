import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * There was no boundary anywhere in the app, so a single bad value — one device
 * with a null GPS fix handed to Leaflet, one undefined field in a stats
 * response — took the whole route to a blank white page.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept as console.error deliberately. `drop: ['console']` has been removed
    // from vite.config.ts so this survives into production builds — without it
    // a live failure leaves no trace anywhere.
    console.error('[ErrorBoundary]', this.props.label ?? '', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center text-danger-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">This screen hit an error</h1>
          <p className="text-sm text-slate-600 mt-1.5">
            The rest of the console is still working — use the sidebar to move somewhere else, or
            reload to try this screen again.
          </p>
        </div>

        <details className="w-full text-left">
          <summary className="text-sm font-medium text-slate-600 cursor-pointer">
            Technical detail
          </summary>
          <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
