import React, { useState } from 'react';
import api from '../lib/api';
import { Lock, User, ArrowRight, ShieldCheck, HelpCircle, Mail, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAuthToken }: { setAuthToken: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Llamada al endpoint del plugin JWT Authentication for WP-API
      let response;
      try {
        // 1. Intentar primero con nuestro endpoint propio nativo de WordPress (/rd-intranet/v1/login) que elude CORS y Varnish
        response = await api.post('/rd-intranet/v1/login', { username, password });
        if (response.data && response.data.success === false) {
          setError(response.data.message || 'Contraseña o usuario incorrectos.');
          setLoading(false);
          return;
        }
      } catch (nativeErr: any) {
        // Si el endpoint nativo da 404 (porque aún no han subido la versión 1.0.4 del plugin), usar el plugin externo jwt-auth
        if (nativeErr.response?.status === 404) {
          response = await api.post('/jwt-auth/v1/token', { username, password });
        } else {
          throw nativeErr;
        }
      }

      const token = response.data.token;
      const user_email = response.data.user_email || `${username}@romanydelgado.com`;
      const user_display_name = response.data.user_display_name || response.data.user_nicename || username;
      
      // Guardar el token en el navegador
      localStorage.setItem('rd_jwt_token', token);
      localStorage.setItem('rd_user_name', user_display_name);
      localStorage.setItem('rd_user_email', user_email);
      
      // Identificar si es admin
      const adminUsers = ['victor', 'luis', 'romanydelgado', 'admin'];
      const isAdmin = response.data.is_admin || adminUsers.includes(username.toLowerCase());
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

      if (!err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('El cortafuegos CDN de tu hosting (Namecheap) bloqueó temporalmente la conexión desde tu red por ráfaga de peticiones (CORS/CDN 429). Por favor espera 2 minutos exactos sin hacer clic para que el CDN libere tu IP.');
      } else if (status === 503 || status === 429 || (typeof serverData === 'string' && serverData.includes('Varnish'))) {
        setError('El servidor del hosting está temporalmente regulando el tráfico (Protección CDN Error ' + (status || 503) + '). Por favor espera 1 o 2 minutos e inténtalo de nuevo.');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const res = await api.post('/rd-intranet/v1/forgot-password', { username: forgotInput.trim() });
      if (res.data && res.data.success) {
        setForgotMessage(res.data.message || 'Se han enviado las instrucciones a tu correo registrado.');
      } else {
        setForgotError(res.data?.message || 'No se encontró una cuenta con ese identificador o correo.');
      }
    } catch (err: any) {
      console.error('Error en recuperación:', err);
      setForgotError('Hubo un error al procesar tu solicitud. Por favor intenta más tarde o contacta a Jefatura/Soporte para restablecerla manualmente.');
    } finally {
      setForgotLoading(false);
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
          <img src="/dog_logo.png" alt="Román & Delgado Logo" className="h-40 sm:h-48 md:h-56 mx-auto object-contain hover:scale-105 transition-transform duration-500 mb-4 drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
          <div className="hidden w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">R&D</span>
          </div>
          <p className="text-amber-400/90 font-medium tracking-[0.2em] uppercase text-xs sm:text-sm flex items-center justify-center gap-2 mt-4">
            <ShieldCheck className="w-4 h-4" />
            Plataforma KANT
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
              <div className="flex items-center justify-between ml-1">
                <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Contraseña</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotError('');
                    setForgotMessage('');
                    if (username && !forgotInput) setForgotInput(username);
                  }}
                  className="text-amber-400/90 hover:text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 group/btn cursor-pointer"
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

        {/* Modal de Recuperación de Contraseña */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Restablecer Contraseña</h3>
                  <p className="text-xs text-slate-400">Recuperación segura del portal corporativo</p>
                </div>
              </div>

              {forgotMessage ? (
                <div className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-sm flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white mb-1">¡Correo Enviado!</p>
                      <p>{forgotMessage}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Volver al Inicio de Sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Ingresa tu <span className="text-amber-400 font-semibold">ID de empleado</span> o tu <span className="text-amber-400 font-semibold">correo corporativo</span>. Te enviaremos un enlace oficial a tu bandeja para crear una nueva contraseña.
                  </p>

                  {forgotError && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                      <p>{forgotError}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-2">Usuario o Correo</label>
                    <input
                      type="text"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      placeholder="Ej: croman o usuario@romanydelgado.com"
                      required
                      className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotInput.trim()}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {forgotLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                        Enviando enlace...
                      </>
                    ) : (
                      'Enviar Enlace de Recuperación'
                    )}
                  </button>

                  <div className="pt-3 border-t border-slate-800/80 text-center">
                    <p className="text-[11px] text-slate-400 leading-normal">
                      💡 <span className="font-semibold text-slate-300">¿Necesitas acceso inmediato?</span> Si tu correo no está accesible, tu <span className="text-amber-400/90 font-medium">Jefatura / Administrador</span> puede restablecer tu clave instantáneamente desde el Panel de Control.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
