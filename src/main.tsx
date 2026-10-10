import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in EduGest:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-slate-100">Ocorreu uma instabilidade</h1>
            <p className="text-sm text-slate-400">
              O sistema recuperou um estado anterior. Clique no botão abaixo para recarregar com segurança.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-300/80 bg-red-950/40 p-2 rounded border border-red-900/50 break-words font-mono text-left max-h-24 overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl transition duration-150 shadow-lg shadow-emerald-900/30"
            >
              Recarregar EduGest
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
