import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    // Si es un error típico de chunk fallido por nueva versión desplegada en Vercel, recargamos una sola vez automáticamente
    const msg = error?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk')) {
      const reloaded = sessionStorage.getItem('rd_chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('rd_chunk_reload', 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 text-3xl">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold">¡Nueva versión disponible o error temporal!</h2>
            <p className="text-slate-400 text-sm">
              El sistema ha sido actualizado recientemente en el servidor. Por favor, recarga tu pantalla para aplicar los últimos cambios.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-400 bg-slate-900 p-3 rounded-lg overflow-x-auto text-left max-h-32">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem('rd_chunk_reload');
                window.location.reload();
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              🔄 Recargar Página Ahora
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
