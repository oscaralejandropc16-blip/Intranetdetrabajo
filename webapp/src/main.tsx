import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertCircle, RefreshCw } from 'lucide-react'
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
        <div className="min-h-screen bg-kant-canvas flex flex-col items-center justify-center p-6 text-slate-900 text-center">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl border border-blue-100 max-w-md shadow-2xl shadow-blue-950/10 space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Nueva versión disponible</h2>
            <p className="text-slate-600 text-sm font-medium">
              El sistema ha sido actualizado recientemente en el servidor. Recarga tu pantalla para aplicar los últimos cambios.
            </p>
            {this.state.error && (
              <pre className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl overflow-x-auto text-left max-h-32">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem('rd_chunk_reload');
                window.location.reload();
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Página Ahora
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
