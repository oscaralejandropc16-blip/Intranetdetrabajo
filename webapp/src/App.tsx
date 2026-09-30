import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import KantMascot from './components/common/KantMascot';
import { submitToServer } from './lib/api';
import { Lock, CheckCircle2, X, AlertCircle, KeyRound, Shield, Briefcase } from 'lucide-react';

export const checkIsJefatura = (nameOrEmail?: string | null, flag?: boolean): boolean => {
  if (!nameOrEmail && flag === true) return true;
  if (!nameOrEmail) return false;
  const lower = nameOrEmail.toLowerCase().trim();

  // Empleados que JAMÁS deben ser jefatura (exclusión irrevocable)
  const employees = ['carmen', 'carmen luisa', 'abgcarmendelgado', 'mariela', 'mariela isabel', 'hector'];
  if (employees.some(e => lower === e || lower.startsWith(e) || lower.includes(e))) {
    return false;
  }

  if (flag === true) return true;

  // Jefatura confirmada
  const bosses = [
    'victor', 'víctor', 'victor roman', 'víctor román', 'victorroman',
    'luis', 'luis delgado', 'luisdelgado',
    'admin', 'jefatura', 'romanydelgado', 'romanydelgado@gmail.com', 'info@romanydelgado.com'
  ];
  return bosses.some(b => lower === b || lower === `${b}@romanydelgado.com` || lower.startsWith(b));
};

function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('rd_jwt_token'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('rd_user_name') || 'Usuario');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const storedUser = localStorage.getItem('rd_user_name');
    const storedAdmin = localStorage.getItem('rd_is_admin') === 'true';
    return checkIsJefatura(storedUser, storedAdmin);
  });

  // Estados para Cambiar Contraseña desde el Navbar
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMessage, setChangeMessage] = useState('');
  const [changeError, setChangeError] = useState('');

  // Sincronizar nombre de usuario y rol de admin
  useEffect(() => {
    const storedUser = localStorage.getItem('rd_user_name');
    const storedAdmin = localStorage.getItem('rd_is_admin') === 'true';
    if (storedUser) {
      setUserName(storedUser);
    }
    const adminDetected = checkIsJefatura(storedUser, storedAdmin);
    setIsAdmin(adminDetected);
    localStorage.setItem('rd_is_admin', adminDetected ? 'true' : 'false');
  }, [authToken]);

  const handleLogout = () => {
    localStorage.removeItem('rd_jwt_token');
    localStorage.removeItem('rd_user_name');
    localStorage.removeItem('rd_user_email');
    localStorage.removeItem('rd_is_admin');
    localStorage.removeItem('rd_cached_user_history');
    localStorage.removeItem('rd_jefe_actuaciones');
    localStorage.removeItem('rd_jefe_ingresos');
    localStorage.removeItem('rd_jefe_programacion');
    localStorage.removeItem('rd_jefe_attachedFiles');
    localStorage.removeItem('rd_admin_draft_actuaciones');
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('rd_cached_user_history') || key.startsWith('rd_jefe_') || key.startsWith('rd_admin_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    sessionStorage.removeItem('rd_emp_active_tab');
    sessionStorage.removeItem('rd_admin_active_view');
    setAuthToken(null);
    setIsAdmin(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangeError('Por favor completa todos los campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setChangeError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setChangeLoading(true);
    setChangeError('');
    setChangeMessage('');

    try {
      const res = await submitToServer('/rd-intranet/v1/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      if (res && res.success) {
        setChangeMessage(res.message || 'Contraseña actualizada exitosamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangeError(res?.message || 'Error al cambiar la contraseña.');
      }
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setChangeError(err.response?.data?.message || 'Error de conexión. Verifica tu contraseña actual e intenta de nuevo.');
    } finally {
      setChangeLoading(false);
    }
  };

  if (!authToken) {
    return (
      <Router>
        <Login setAuthToken={setAuthToken} />
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Navbar Corporativo Responsive con Glow y Mascota Animada */}
        <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-amber-500/30 px-3 sm:px-8 py-3 flex justify-between items-center shadow-xl sticky top-0 z-50">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <KantMascot size="sm" userName={userName} />
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white tracking-wide flex items-center gap-1 truncate">
                <span className="hidden sm:inline">Plataforma</span> <span className="text-amber-400 font-black tracking-wider text-glow-amber">KANT</span>
              </h1>
              <span className="relative flex h-2 w-2 shrink-0" title="Sistema KANT en línea">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 items-center shrink-0">
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-yellow-500/15 border border-amber-500/40 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] glow-amber-sm">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-black text-amber-300 tracking-wider uppercase">Jefatura</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-xs">
                <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-300 hidden sm:inline">Personal</span>
              </div>
            )}
            <div className="hidden sm:block w-px h-6 bg-slate-700/80 mx-1"></div>
            <span className="hidden md:block text-slate-300 font-semibold text-sm">Bienvenido, {userName || 'Usuario'}</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center justify-center text-[10px] sm:text-xs font-black text-white uppercase flex-shrink-0">
              {String(userName || 'US').substring(0, 2)}
            </div>
            
            <button
              onClick={() => {
                setShowChangeModal(true);
                setChangeError('');
                setChangeMessage('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              title="Cambiar Contraseña"
              className="text-slate-400 hover:text-amber-400 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer sm:ml-1 sm:border-l border-slate-700/80 sm:pl-3 p-1"
            >
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Clave</span>
            </button>

            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 text-xs sm:text-sm font-semibold transition-colors cursor-pointer px-1 py-1">Salir</button>
          </div>
        </nav>

        {/* Contenido principal */}
        <main className="flex-1 p-2.5 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={isAdmin ? <AdminDashboard /> : <EmployeeDashboard />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
          </Routes>
        </main>

        {/* Modal para Cambiar Contraseña en Sesión */}
        {showChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-400">Actualiza tu clave de seguridad personal</p>
                </div>
              </div>

              {changeMessage ? (
                <div className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-sm flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white mb-1">¡Clave Actualizada!</p>
                      <p>{changeMessage}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangeModal(false)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    Cerrar y Continuar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {changeError && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                      <p>{changeError}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1.5">Contraseña Actual</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Tu clave actual"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1.5">Nueva Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1.5">Confirmar Nueva Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Repite tu nueva clave"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {changeLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                        Actualizando...
                      </>
                    ) : (
                      'Guardar Nueva Contraseña'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
