import React, { useState } from 'react';
import api from '../lib/api';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAuthToken }: { setAuthToken: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Llamada al endpoint del plugin JWT Authentication for WP-API
      const response = await api.post('/jwt-auth/v1/token', {
        username,
        password
      });

      const { token, user_email, user_nicename, user_display_name } = response.data;
      
      // Guardar el token en el navegador
      localStorage.setItem('rd_jwt_token', token);
      localStorage.setItem('rd_user_name', user_display_name);
      localStorage.setItem('rd_user_email', user_email);
      
      // Identificar si es admin
      const adminUsers = ['victor', 'luis', 'romanydelgado'];
      const isAdmin = adminUsers.includes(user_nicename.toLowerCase()) || adminUsers.includes(username.toLowerCase());
      localStorage.setItem('rd_is_admin', isAdmin ? 'true' : 'false');
      
      // Actualizar el estado de la app
      setAuthToken(token);

      // Redirigir dependiendo del usuario
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      console.error('Error de login:', err);
      
      const status = err.response?.status;
      const serverData = err.response?.data;
      const serverMessage = typeof serverData === 'object' ? serverData?.message : undefined;

      if (status === 503 || status === 429 || (typeof serverData === 'string' && serverData.includes('Varnish'))) {
        setError('El servidor del hosting está temporalmente regulando el tráfico (Protección CDN Error ' + (status || 503) + '). Por favor espera 30 segundos e inténtalo de nuevo.');
      } else if (serverMessage) {
        // Limpiar etiquetas HTML del mensaje que devuelve WordPress (ej. <strong>ERROR</strong>)
        setError(serverMessage.replace(/<[^>]*>?/gm, ''));
      } else {
        setError('El nombre de usuario o la contraseña son incorrectos (o no hubo respuesta HTTP ' + (status || 'Error') + ').');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Orbs (Glassmorphism effect) */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-700">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Román & Delgado Logo" className="h-40 sm:h-48 md:h-56 mx-auto object-contain hover:scale-105 transition-transform duration-500 mb-4 drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
          <div className="hidden w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">R&D</span>
          </div>
          <p className="text-amber-400/90 font-medium tracking-[0.2em] uppercase text-xs sm:text-sm flex items-center justify-center gap-2 mt-4">
            <ShieldCheck className="w-4 h-4" />
            Portal Intranet
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 sm:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl text-sm font-medium flex items-start gap-3 animate-in slide-in-from-top-2">
                <div className="mt-0.5">⚠️</div>
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider ml-1">Usuario</label>
              <div className="relative group/input">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within/input:text-amber-400" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="ID de empleado"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within/input:text-amber-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all text-white placeholder:text-slate-600 font-medium tracking-widest"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 group/btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                  Verificando credenciales...
                </span>
              ) : (
                <>
                  Acceder al Portal
                  <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-500 text-xs font-medium mt-8">
          &copy; {new Date().getFullYear()} Román & Delgado. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
