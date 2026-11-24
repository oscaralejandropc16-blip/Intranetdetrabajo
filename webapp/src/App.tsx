import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import KantMascot from './components/common/KantMascot';
import { Modal } from './components/ui/Modal';
import { 
  applyThemeToDOM, 
  THEMES, 
  type FestiveThemeId 
} from './lib/themeManager';
import { submitToServer } from './lib/api';
import { Lock, CheckCircle2, AlertCircle, KeyRound, Shield, Briefcase, Cpu, LogOut } from 'lucide-react';
import { checkIsSistemas, checkIsJefatura } from './lib/supabaseAdapter';
export { checkIsSistemas, checkIsJefatura };

function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try { return localStorage.getItem('rd_jwt_token'); } catch { return null; }
  });
  const [userName, setUserName] = useState<string>(() => {
    try { return localStorage.getItem('rd_user_name') || 'Usuario'; } catch { return 'Usuario'; }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const storedUser = localStorage.getItem('rd_user_name');
      const storedAdmin = localStorage.getItem('rd_is_admin') === 'true';
      return checkIsJefatura(storedUser, storedAdmin);
    } catch {
      return false;
    }
  });

  // Tema Festivo Activo (Halloween, Día del Abogado, Navidad, Fechas Patrias o Clásico)
  const [activeTheme, setActiveTheme] = useState<FestiveThemeId>(() => applyThemeToDOM());

  useEffect(() => {
    applyThemeToDOM();
    const handleThemeChange = () => {
      const current = applyThemeToDOM();
      setActiveTheme(current);
    };
    window.addEventListener('rd_festive_theme_changed', handleThemeChange);
    window.addEventListener('rd_simulated_date_changed', handleThemeChange);
    return () => {
      window.removeEventListener('rd_festive_theme_changed', handleThemeChange);
      window.removeEventListener('rd_simulated_date_changed', handleThemeChange);
    };
  }, []);

  const themeConfig = THEMES[activeTheme] || THEMES.default;

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
    try {
      const storedUser = localStorage.getItem('rd_user_name');
      const cleanStored = (storedUser || '').toLowerCase().trim();
      if (cleanStored === 'contador' || cleanStored === 'contador@romanydelgado.com') {
        handleLogout();
        return;
      }
      const storedAdmin = localStorage.getItem('rd_is_admin') === 'true';
      if (storedUser) {
        setUserName(storedUser);
      }
      const adminDetected = checkIsJefatura(storedUser, storedAdmin);
      setIsAdmin(adminDetected);
      localStorage.setItem('rd_is_admin', adminDetected ? 'true' : 'false');
    } catch {}
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

  const roleBadge = checkIsSistemas(userName) ? (
    <div className="flex items-center gap-1.5 bg-cyan-400/15 border border-cyan-300/35 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl shadow-2xs">
      <Cpu className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
      <span className="text-[11px] sm:text-xs font-bold text-cyan-50 tracking-wider uppercase">Sistemas & TI</span>
    </div>
  ) : isAdmin ? (
    <div className="flex items-center gap-1.5 bg-sky-400/20 border border-sky-300/40 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl shadow-2xs">
      <Shield className="w-3.5 h-3.5 text-sky-200 shrink-0" />
      <span className="text-[11px] sm:text-xs font-extrabold text-white tracking-wider uppercase">Jefatura</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 bg-white/12 border border-white/25 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs">
      <Briefcase className="w-3.5 h-3.5 text-sky-200 shrink-0" />
      <span className="text-[11px] sm:text-xs font-bold text-blue-50 hidden sm:inline">Personal</span>
    </div>
  );

  return (
    <Router>
      <div className={`min-h-screen bg-kant-canvas flex flex-col font-sans transition-colors duration-500 ${themeConfig.themeClass}`}>
        {/* ═══ Navbar Corporativo Azul Zafiro ═══ */}
        <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white border-b border-blue-400/25 shadow-lg shadow-blue-950/20">
          {/* Línea superior institucional adaptativa */}
          <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${themeConfig.navbarTopLine} transition-all duration-700`} />

          <div className="flex justify-between items-center px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
            {/* Logo Corporativo (Perrito KANT) */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <KantMascot size="sm" userName={userName} />
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5 truncate">
                  <span className="hidden sm:inline font-semibold text-blue-100">Plataforma</span>{' '}
                  <span className="text-sky-300 font-black tracking-wide">KANT</span>
                </h1>
                <span className="relative flex h-2 w-2 shrink-0" title="Sistema KANT en línea">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
            </div>

            {/* Right side: role + user + actions */}
            <div className="flex gap-2 sm:gap-3 items-center shrink-0">
              {roleBadge}
              <div className="hidden sm:block w-px h-5 bg-white/20" />
              <span className="hidden lg:block text-blue-50 font-semibold text-sm">{userName || 'Usuario'}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#1e3a8a] border border-sky-200 flex items-center justify-center text-[10px] sm:text-xs font-extrabold uppercase shrink-0 shadow-sm">
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
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-white/12 border border-transparent hover:border-white/20"
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Clave</span>
              </button>

              <button
                onClick={handleLogout}
                className="text-blue-100 hover:text-rose-200 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-rose-500/20 border border-transparent hover:border-rose-300/30"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </nav>

        {/* ═══ Contenido Principal ═══ */}
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={isAdmin ? <AdminDashboard /> : <EmployeeDashboard />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
          </Routes>
        </main>

        {/* ═══ Modal para Cambiar Contraseña ═══ */}
        <Modal
          isOpen={showChangeModal}
          onClose={() => setShowChangeModal(false)}
          title="Cambiar Contraseña"
          description="Actualiza tu clave de seguridad personal"
          icon={<KeyRound className="w-5 h-5" />}
          size="md"
          footer={!changeMessage ? (
            <button
              type="submit"
              form="change-password-form"
              disabled={changeLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {changeLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Guardar Nueva Contraseña'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowChangeModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
            >
              Cerrar y Continuar
            </button>
          )}
        >
          {changeMessage ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-700 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800 mb-1">¡Clave Actualizada!</p>
                <p>{changeMessage}</p>
              </div>
            </div>
          ) : (
            <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
              {changeError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-start gap-2.5 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <p>{changeError}</p>
                </div>
              )}

              <div>
                <label className="text-slate-500 font-semibold text-xs uppercase tracking-wider block mb-1.5">Contraseña Actual</label>
                <div className="relative group/input">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within/input:text-blue-500" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Tu clave actual"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-semibold text-xs uppercase tracking-wider block mb-1.5">Nueva Contraseña</label>
                <div className="relative group/input">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within/input:text-blue-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-semibold text-xs uppercase tracking-wider block mb-1.5">Confirmar Nueva Contraseña</label>
                <div className="relative group/input">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within/input:text-blue-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repite tu nueva clave"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none transition-all"
                  />
                </div>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Router>
  );
}

export default App;
