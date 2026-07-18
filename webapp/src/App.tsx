import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import api from './lib/api';
import { Lock, CheckCircle2, X, AlertCircle, KeyRound } from 'lucide-react';

function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('rd_jwt_token'));
  const [userName, setUserName] = useState<string>('Usuario');
  const [isAdmin, setIsAdmin] = useState<boolean>(localStorage.getItem('rd_is_admin') === 'true');

  // Estados para Cambiar Contraseña desde el Navbar
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMessage, setChangeMessage] = useState('');
  const [changeError, setChangeError] = useState('');

  useEffect(() => {
    if (authToken) {
      setUserName(localStorage.getItem('rd_user_name') || 'Usuario');
      setIsAdmin(localStorage.getItem('rd_is_admin') === 'true');
    }
  }, [authToken]);

  const handleLogout = () => {
    localStorage.removeItem('rd_jwt_token');
    localStorage.removeItem('rd_user_name');
    localStorage.removeItem('rd_user_email');
    setAuthToken(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setChangeError('La nueva contraseña y su confirmación no coinciden.');
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
      const res = await api.post('/rd-intranet/v1/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      if (res.data && res.data.success) {
        setChangeMessage(res.data.message || 'Contraseña actualizada exitosamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangeError(res.data?.message || 'Error al cambiar la contraseña.');
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
        {/* Navbar Corporativo Responsive */}
        <nav className="bg-slate-900 border-b border-amber-500/20 px-4 sm:px-8 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="Logo R&D" className="h-8 sm:h-10 w-auto object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
            <div className="hidden w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-md flex items-center justify-center text-slate-900 font-bold text-lg sm:text-xl shadow-md">
              R&D
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide hidden sm:block">Portal <span className="text-amber-400">Intranet</span></h1>
          </div>
          <div className="flex gap-3 sm:gap-4 items-center">
            {isAdmin && (
              <Link to="/admin" className="text-amber-400 hover:text-amber-300 text-xs sm:text-sm font-bold transition-colors border border-amber-500/30 px-2 sm:px-3 py-1 rounded-md bg-amber-500/10">Jefatura</Link>
            )}
            <div className="hidden sm:block w-px h-6 bg-slate-700 mx-1 sm:mx-2"></div>
            <span className="hidden md:block text-slate-300 font-medium text-sm">Bienvenido, {userName}</span>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-amber-500/50 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">{userName.substring(0, 2)}</div>
            
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
              className="text-slate-400 hover:text-amber-400 text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer sm:ml-2 sm:border-l border-slate-700 sm:pl-3"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Clave</span>
            </button>

            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 text-sm font-medium transition-colors cursor-pointer">Salir</button>
          </div>
        </nav>

        {/* Contenido principal */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={!isAdmin ? <EmployeeDashboard /> : <Navigate to="/admin" />} />
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
