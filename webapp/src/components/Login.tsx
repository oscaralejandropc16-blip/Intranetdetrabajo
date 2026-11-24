import React, { useState } from 'react';
import { submitToServer } from '../lib/api';
import { checkIsJefatura } from '../App';
import { Lock, User, ArrowRight, HelpCircle, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import KantMascot from './common/KantMascot';

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
      // Iniciar sesión usando submitToServer (fetch + FormData) para eludir el WAF de Namecheap
      const res = await submitToServer('/rd-intranet/v1/login', { username, password });

      if (!res || res.success === false) {
        setError(res?.message || 'Contraseña o usuario incorrectos.');
        setLoading(false);
        return;
      }

      const token = res.token;
      if (!token) {
        setError('El servidor no devolvió una clave de sesión válida.');
        setLoading(false);
        return;
      }

      const user_email = res.user_email || `${username}@romanydelgado.com`;
      const user_display_name = res.user_display_name || res.user_nicename || username;
      
      // Guardar el token en el navegador
      localStorage.setItem('rd_jwt_token', token);
      localStorage.setItem('rd_user_name', user_display_name);
      localStorage.setItem('rd_user_email', user_email);
      
      // Identificar si es admin
      const isAdmin = checkIsJefatura(username, res.is_admin) || checkIsJefatura(user_display_name, res.is_admin);
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
      console.error('Error al iniciar sesión:', err);
      setError(err?.message || 'Error de conexión con el servidor. Verifica tus credenciales e intenta de nuevo.');
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
      const res = await submitToServer('/rd-intranet/v1/forgot-password', { username: forgotInput.trim() });
      if (res && res.success) {
        setForgotMessage(res.message || 'Se han enviado las instrucciones a tu correo registrado.');
      } else {
        setForgotError(res?.message || 'No se encontró una cuenta con ese identificador o correo.');
      }
    } catch (err: any) {
      console.error('Error en recuperación:', err);
      setForgotError('Hubo un error al procesar tu solicitud. Por favor intenta más tarde o contacta a Jefatura/Soporte para restablecerla manualmente.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2454] via-[#1e3a8a] to-[#1d4ed8] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Orbes decorativos Zafiro & Azul Hielo */}
      <div className="pointer-events-none absolute -top-28 -left-24 w-96 h-96 rounded-full bg-sky-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-400/20 blur-3xl animate-float-slow" style={{ animationDelay: '1.2s' }} />

      <div className="w-full max-w-md z-10 animate-card-enter">
        
        {/* Header Section Ejecutivo con Logo Perrito KANT */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3 relative p-2.5 rounded-3xl bg-white border-2 border-sky-200/80 shadow-xl shadow-blue-950/30">
            <KantMascot size="lg" userName={username} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <p className="font-display text-white font-extrabold tracking-tight text-2xl sm:text-[26px] flex items-center gap-1.5">
              Plataforma <span className="text-sky-300 font-black">KANT</span>
            </p>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-1.5 font-semibold px-3.5 py-1 rounded-full bg-white/12 border border-white/20 backdrop-blur-md">
            Román & Delgado • Intranet Corporativa
          </p>
        </div>

        {/* Login Card Ejecutiva Blanco Nítido */}
        <div className="bg-white border border-blue-200 p-7 sm:p-9 rounded-3xl shadow-2xl shadow-blue-950/35 relative overflow-hidden group transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600" />
          
          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-sm font-medium flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-slate-700 font-bold text-xs uppercase tracking-wider ml-1">Usuario</label>
              <div className="relative group/input">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within/input:text-blue-600" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="ID de empleado"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 focus:bg-white border border-blue-200 hover:border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Contraseña</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotError('');
                    setForgotMessage('');
                    if (username && !forgotInput) setForgotInput(username);
                  }}
                  className="text-blue-700 hover:text-indigo-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within/input:text-blue-600" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 focus:bg-white border border-blue-200 hover:border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-widest shadow-2xs"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="shimmer-sweep w-full mt-3 bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#1d4ed8] hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-base py-4 rounded-2xl transition-all shadow-lg shadow-blue-700/30 hover:shadow-xl hover:shadow-blue-700/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5 group/btn cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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

        {/* Modal de Recuperación de Contraseña Modernizado */}
        <Modal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          title="Restablecer Contraseña"
          description="Recuperación segura del portal corporativo"
          icon={<Mail className="w-5 h-5 text-blue-600" />}
          size="md"
        >
          {forgotMessage ? (
            <div className="space-y-5 py-2">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-900 mb-1">¡Correo Enviado!</p>
                  <p className="text-slate-600 text-xs sm:text-sm">{forgotMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer text-sm"
              >
                Volver al Inicio de Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-1">
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Ingresa tu <span className="text-blue-600 font-semibold">ID de empleado</span> o tu <span className="text-blue-600 font-semibold">correo corporativo</span>. Te enviaremos un enlace oficial a tu bandeja para crear una nueva contraseña.
              </p>

              {forgotError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <p>{forgotError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold text-xs uppercase tracking-wider block">Usuario o Correo</label>
                <input
                  type="text"
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  placeholder="Ej: croman o usuario@romanydelgado.com"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading || !forgotInput.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {forgotLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Enviando enlace...
                  </>
                ) : (
                  'Enviar Enlace de Recuperación'
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500 leading-normal">
                  <span className="font-semibold text-slate-700">¿Necesitas acceso inmediato?</span> Si tu correo no está accesible, tu <span className="text-blue-600 font-medium">Jefatura / Administrador</span> puede restablecer tu clave instantáneamente desde el Panel de Control.
                </p>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
}
