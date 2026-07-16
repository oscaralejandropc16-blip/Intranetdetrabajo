import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('rd_jwt_token'));
  const [userName, setUserName] = useState<string>('Usuario');

  const [isAdmin, setIsAdmin] = useState<boolean>(localStorage.getItem('rd_is_admin') === 'true');

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
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 text-sm font-medium transition-colors sm:ml-2 md:ml-4 sm:border-l border-slate-700 sm:pl-3 md:pl-4">Salir</button>
          </div>
        </nav>

        {/* Contenido principal */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={!isAdmin ? <EmployeeDashboard /> : <Navigate to="/admin" />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
