import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, KeyRound, Plus, Edit3, Trash2, Search, 
  X, Eye, EyeOff, UserCheck, Cpu, RefreshCw,
  RotateCcw, History, UserX, Calendar, Lock
} from 'lucide-react';
import { 
  supabaseGetSystemUsers, 
  supabaseSaveSystemUsers, 
  supabaseUpdateUserPassword,
  supabaseGetDeletedUsers,
  supabaseEliminarUsuarioConHistorial,
  supabaseRestaurarUsuario,
  supabasePurgarUsuarioDefinitivo,
  checkIsSistemas,
  type SystemUser,
  type DeletedSystemUser 
} from '../../lib/supabaseAdapter';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

export default function ModuloControlUsuarios() {
  const currentUserName = localStorage.getItem('rd_user_name') || '';
  const isSistemas = checkIsSistemas(currentUserName);

  if (!isSistemas) {
    return (
      <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-3xl text-center text-white max-w-xl mx-auto my-8 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Módulo Restringido</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          El control y gestión de cuentas, roles y claves de acceso está reservado exclusivamente para el superadministrador de Sistemas & TI (Óscar).
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'activos' | 'eliminados'>('activos');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedSystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletedSearchQuery, setDeletedSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('todos');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [passwordModalUser, setPasswordModalUser] = useState<SystemUser | null>(null);

  // Formularios
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    password: string;
    department: 'Legal' | 'Marketing' | 'Contabilidad' | 'Servicios Generales' | 'Sistemas' | 'Administración';
    role: 'jefatura' | 'empleado' | 'sistemas';
  }>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    department: 'Legal',
    role: 'empleado'
  });

  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Alerta del sistema
  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Cargar usuarios activos y dados de baja
  const loadUsers = async () => {
    setLoading(true);
    try {
      const [dataActivos, dataEliminados] = await Promise.all([
        supabaseGetSystemUsers(),
        supabaseGetDeletedUsers()
      ]);
      setUsers(dataActivos);
      setDeletedUsers(dataEliminados);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Formato amigable de fecha de baja
  const formatDeletedDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no registrada';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  // Filtrado de usuarios eliminados
  const filteredDeletedUsers = useMemo(() => {
    if (!deletedSearchQuery.trim()) return deletedUsers;
    const q = deletedSearchQuery.toLowerCase().trim();
    return deletedUsers.filter(d => 
      d.fullName.toLowerCase().includes(q) ||
      d.username.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.department.toLowerCase().includes(q) ||
      (d.motivo && d.motivo.toLowerCase().includes(q)) ||
      (d.deletedBy && d.deletedBy.toLowerCase().includes(q))
    );
  }, [deletedUsers, deletedSearchQuery]);

  // Filtrado
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (deptFilter !== 'todos' && u.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchUser = u.username.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDept = u.department.toLowerCase().includes(q);
        return matchName || matchUser || matchEmail || matchDept;
      }
      return true;
    });
  }, [users, deptFilter, searchQuery]);

  // Contadores
  const totalUsers = users.length;
  const legalUsers = users.filter(u => u.department === 'Legal').length;
  const techUsers = users.filter(u => u.department === 'Sistemas').length;
  const adminUsers = users.filter(u => u.role === 'jefatura' || u.department === 'Administración').length;

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setUserForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      department: 'Legal',
      role: 'empleado'
    });
    setCreateModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (user: SystemUser) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '',
      department: user.department,
      role: user.role
    });
    setEditModalOpen(true);
  };

  // Guardar Nuevo Usuario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.fullName.trim() || !userForm.username.trim()) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Por favor complete el nombre completo y el nombre de usuario.'
      });
      return;
    }

    const cleanUsername = userForm.username.toLowerCase().trim().replace(/\s+/g, '');
    const cleanEmail = userForm.email.trim() || `${cleanUsername}@romanydelgado.com`;

    // Verificar si ya existe
    const exists = users.some(u => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail.toLowerCase());
    if (exists) {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Usuario ya existe',
        message: `Ya existe un usuario con el identificador "${cleanUsername}" o el correo "${cleanEmail}".`
      });
      return;
    }

    const newUser: SystemUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      fullName: userForm.fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      department: userForm.department,
      role: userForm.role,
      passwordHash: userForm.password.trim() || '123456',
      active: true,
      createdAt: new Date().toISOString()
    };

    const updated = [...users, newUser];
    setUsers(updated);
    setCreateModalOpen(false);

    await supabaseSaveSystemUsers(updated);

    setSystemAlert({
      isOpen: true,
      type: 'success',
      title: 'Usuario Creado Exitosamente',
      message: `El usuario "${newUser.fullName}" (@${newUser.username}) ha sido creado con acceso al departamento de ${newUser.department}. Clave asignada: ${newUser.passwordHash}`
    });
  };

  // Guardar Edición de Usuario
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedList = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          fullName: userForm.fullName.trim(),
          department: userForm.department,
          role: userForm.role,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    setUsers(updatedList);
    setEditModalOpen(false);
    setEditingUser(null);

    await supabaseSaveSystemUsers(updatedList);

    setSystemAlert({
      isOpen: true,
      type: 'success',
      title: 'Usuario Actualizado',
      message: `Los datos y permisos de "${userForm.fullName}" han sido actualizados en la plataforma.`
    });
  };

  // Abrir Modal de Cambio de Clave
  const handleOpenPasswordModal = (user: SystemUser) => {
    setPasswordModalUser(user);
    setNewPassword('');
    setShowPassword(false);
  };

  // Guardar Nueva Clave
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Clave requerida',
        message: 'Por favor ingrese la nueva contraseña de acceso.'
      });
      return;
    }

    const cleanPass = newPassword.trim();
    const updated = users.map(u => {
      if (u.id === passwordModalUser.id) {
        return { ...u, passwordHash: cleanPass, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    setUsers(updated);
    const targetUser = passwordModalUser;
    setPasswordModalUser(null);
    setNewPassword('');

    await supabaseUpdateUserPassword(targetUser.id, cleanPass);
    await supabaseSaveSystemUsers(updated);

    setSystemAlert({
      isOpen: true,
      type: 'success',
      title: 'Clave de Acceso Modificada',
      message: `La contraseña de "${targetUser.fullName}" (@${targetUser.username}) ha sido actualizada exitosamente a: "${cleanPass}". El usuario ya puede iniciar sesión con esta nueva clave.`
    });
  };

  // Eliminar / Dar de Baja Usuario y Enviar al Historial
  const handleDeleteUser = (user: SystemUser) => {
    if (user.username === 'victor' || user.username === 'luis' || user.username === 'oscar' || user.username === 'oscarpc') {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Acción Bloqueada',
        message: 'No es posible dar de baja a los administradores principales del sistema (Víctor, Luis y Óscar).'
      });
      return;
    }

    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: `¿Dar de baja a ${user.fullName}?`,
      message: `¿Está seguro de que desea revocar el acceso a "@${user.username}" de la plataforma KANT?

Consecuencias Inmediatas:
• El usuario ya NO podrá iniciar sesión en KANT (computadoras ni teléfonos móviles).
• La cuenta pasará automáticamente al "Historial de Usuarios Eliminados".
• Podrá restaurar su acceso en cualquier momento si lo requiere.`,
      showCancel: true,
      confirmText: 'Sí, Dar de Baja y Mover al Historial',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        await supabaseEliminarUsuarioConHistorial(
          user, 
          currentUserName || 'Óscar (Sistemas TI)', 
          'Baja aplicada desde el panel de control de Sistemas & TI'
        );
        await loadUsers();
        setSystemAlert({
          isOpen: true,
          type: 'info',
          title: 'Usuario Dado de Baja',
          message: `El usuario "@${user.username}" fue dado de baja y transferido al Historial de Usuarios Eliminados. Su inicio de sesión ha quedado denegado.`
        });
      }
    });
  };

  // Restaurar Acceso a Usuario
  const handleRestaurarUsuario = (deletedUser: DeletedSystemUser) => {
    setSystemAlert({
      isOpen: true,
      type: 'info',
      title: `¿Restaurar acceso a ${deletedUser.fullName}?`,
      message: `¿Desea reactivar la cuenta de "@${deletedUser.username}" en la plataforma KANT?

Efectos:
• Se reactivará como usuario activo en el departamento de ${deletedUser.department}.
• El usuario podrá volver a ingresar normalmente a la intranet con su clave asignada.
• Se removerá del historial de cuentas dadas de baja.`,
      showCancel: true,
      confirmText: 'Sí, Restaurar Acceso',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await supabaseRestaurarUsuario(deletedUser);
        await loadUsers();
        setSystemAlert({
          isOpen: true,
          type: 'success',
          title: 'Usuario Reactivado',
          message: `El usuario "${deletedUser.fullName}" (@${deletedUser.username}) ha sido reactivado exitosamente con acceso activo a KANT.`
        });
      }
    });
  };

  // Purgar Registro Definitivamente del Historial
  const handlePurgarUsuario = (deletedUser: DeletedSystemUser) => {
    setSystemAlert({
      isOpen: true,
      type: 'error',
      title: `¿Purgar definitivamente a ${deletedUser.fullName}?`,
      message: `ATENCIÓN: Se eliminará permanentemente a "@${deletedUser.username}" del historial de auditoría de bajas. Esta acción es irreversible.`,
      showCancel: true,
      confirmText: 'Sí, Purgar Definitivo',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: async () => {
        await supabasePurgarUsuarioDefinitivo(deletedUser.id);
        await loadUsers();
        setSystemAlert({
          isOpen: true,
          type: 'info',
          title: 'Registro Purgado',
          message: `El registro de "@${deletedUser.username}" fue eliminado definitivamente del historial de auditoría.`
        });
      }
    });
  };

  // Color badge por departamento
  const getDeptBadge = (dept: string) => {
    switch (dept) {
      case 'Legal':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Marketing':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Sistemas':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Contabilidad':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Servicios Generales':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Administración':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CABECERA PRINCIPAL */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Administración de Sistemas & TI
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Control de Acceso, Usuarios & Roles
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Crea cuentas, asigna roles de departamento y gestiona las claves de acceso de la plataforma KANT.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={loadUsers}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Refrescar lista de usuarios"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex-1 md:flex-none px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Crear Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Activos</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalUsers}</div>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Área Legal</span>
            <div className="text-xl sm:text-2xl font-black text-blue-300 mt-0.5">{legalUsers}</div>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">Sistemas & TI</span>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">{techUsers}</div>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Jefatura / Directivos</span>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">{adminUsers}</div>
          </div>
          <button
            onClick={() => setActiveTab('eliminados')}
            className={`rounded-2xl p-3.5 border text-left transition-all cursor-pointer ${
              activeTab === 'eliminados' 
                ? 'bg-rose-950/80 border-rose-500 shadow-md ring-1 ring-rose-500/50' 
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-rose-500/40'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center justify-between">
              <span>Bajas / Historial</span>
              <History className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">{deletedUsers.length}</div>
          </button>
        </div>
      </div>

      {/* SELECTOR DE PESTAÑAS: USUARIOS ACTIVOS vs HISTORIAL DE ELIMINADOS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('activos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'activos'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${activeTab === 'activos' ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>Directorio de Usuarios Activos</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'activos' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('eliminados')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'eliminados'
                ? 'bg-rose-950 text-rose-200 shadow-md border border-rose-800'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <History className={`w-4 h-4 ${activeTab === 'eliminados' ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Historial de Usuarios Eliminados</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'eliminados' 
                ? 'bg-rose-500 text-white' 
                : deletedUsers.length > 0 
                ? 'bg-rose-100 text-rose-700' 
                : 'bg-slate-200 text-slate-700'
            }`}>
              {deletedUsers.length}
            </span>
          </button>
        </div>

        {activeTab === 'activos' && (
          <div className="text-xs text-slate-400 font-bold hidden sm:block">
            {filteredUsers.length} de {users.length} colaboradores activos visibles
          </div>
        )}
        {activeTab === 'eliminados' && (
          <div className="text-xs text-rose-500 font-bold hidden sm:block">
            {filteredDeletedUsers.length} cuentas en historial de bajas con acceso denegado
          </div>
        )}
      </div>

      {/* VISTA 1: DIRECTORIO DE USUARIOS ACTIVOS */}
      {activeTab === 'activos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Pestañas de departamentos */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['todos', 'Legal', 'Marketing', 'Sistemas', 'Contabilidad', 'Servicios Generales', 'Administración'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    deptFilter === dept
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept === 'todos' ? 'Todos los Departamentos' : dept}
                </button>
              ))}
            </div>

            {/* Input de Búsqueda */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, @usuario..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* TABLA DE USUARIOS ACTIVOS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                Cargando directorio de usuarios de la plataforma...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Usuario & Colaborador</th>
                      <th className="py-4 px-4">Identificador (@login)</th>
                      <th className="py-4 px-4 text-center">Departamento</th>
                      <th className="py-4 px-4 text-center">Rol en KANT</th>
                      <th className="py-4 px-4 text-center">Clave Asignada</th>
                      <th className="py-4 px-6 text-right">Acciones TI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                          No se encontraron usuarios coincidentes con el filtro de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const initials = u.fullName
                          .split(' ')
                          .map(p => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            
                            {/* Usuario y Nombre */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-xs shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900">{u.fullName}</div>
                                  <div className="text-[11px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Login */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              @{u.username}
                            </td>

                            {/* Departamento */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getDeptBadge(u.department)}`}>
                                {u.department}
                              </span>
                            </td>

                            {/* Rol */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                u.role === 'jefatura'
                                  ? 'bg-rose-100 text-rose-800'
                                  : u.role === 'sistemas'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {u.role === 'jefatura' ? 'Jefatura' : u.role === 'sistemas' ? 'Administrador TI' : 'Colaborador'}
                              </span>
                            </td>

                            {/* Clave */}
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                              <span className="px-2 py-1 bg-slate-100 rounded-md text-[11px] font-bold">
                                {u.passwordHash ? '••••••••' : 'Predeterminada'}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Cambiar Clave */}
                                <button
                                  onClick={() => handleOpenPasswordModal(u)}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-amber-200"
                                  title="Cambiar la clave de acceso de este usuario"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Clave</span>
                                </button>

                                {/* Editar Rol / Depto */}
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                                  title="Editar datos, rol o departamento"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar usuario del sistema y mover al historial de eliminados"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE USUARIOS ELIMINADOS */}
      {activeTab === 'eliminados' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* BANNER DE AUDITORÍA Y SEGURIDAD */}
          <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Lock className="w-3 h-3" /> Bloqueo de Acceso Activo
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Historial de Auditoría & Cuentas Dadas de Baja
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                  Las cuentas en este listado tienen el acceso <strong>estrictamente bloqueado</strong> en la plataforma KANT (computadoras y móviles). Puedes restaurar su acceso con un clic si el colaborador se reincorpora o purgar el registro definitivamente.
                </p>
              </div>
            </div>

            {/* Buscador de eliminados */}
            <div className="relative min-w-[260px] w-full md:w-auto">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={deletedSearchQuery}
                onChange={(e) => setDeletedSearchQuery(e.target.value)}
                placeholder="Buscar en eliminados..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-rose-500 focus:bg-slate-800 transition-all"
              />
            </div>
          </div>

          {/* TABLA DE USUARIOS ELIMINADOS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                Cargando historial de cuentas eliminadas...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Usuario & Colaborador</th>
                      <th className="py-4 px-4">Identificador Revocado</th>
                      <th className="py-4 px-4 text-center">Departamento</th>
                      <th className="py-4 px-4">Fecha & Hora de Baja</th>
                      <th className="py-4 px-6">Auditoría / Motivo</th>
                      <th className="py-4 px-6 text-right">Acciones TI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredDeletedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center">
                          <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                              <History className="w-6 h-6" />
                            </div>
                            <h4 className="font-extrabold text-slate-800 text-sm">No hay registros de baja</h4>
                            <p className="text-slate-400 text-xs mt-1">
                              {deletedSearchQuery
                                ? 'No se encontraron coincidencias para la búsqueda actual en el historial.'
                                : 'No hay usuarios dados de baja actualmente en la plataforma.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDeletedUsers.map((d) => {
                        const initials = d.fullName
                          .split(' ')
                          .map(p => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'EX';

                        return (
                          <tr key={d.id} className="hover:bg-rose-50/40 transition-colors">
                            
                            {/* Usuario y Nombre */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black flex items-center justify-center text-xs shrink-0 relative">
                                  {initials}
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center">
                                    <X className="w-2 h-2 text-white stroke-[3]" />
                                  </span>
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                    <span>{d.fullName}</span>
                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider">
                                      Baja
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">{d.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Identificador Revocado */}
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-xs">
                                <Lock className="w-3 h-3 text-rose-500" />
                                <span className="line-through">@{d.username}</span>
                              </span>
                            </td>

                            {/* Departamento Previo */}
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getDeptBadge(d.department)}`}>
                                {d.department}
                              </span>
                            </td>

                            {/* Fecha de Baja */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{formatDeletedDate(d.deletedAt)}</span>
                              </div>
                            </td>

                            {/* Auditoría / Motivo */}
                            <td className="py-4 px-6">
                              <div className="max-w-xs">
                                <div className="text-[11px] font-black text-slate-700">
                                  Por: <span className="text-cyan-700">{d.deletedBy || 'Óscar (Sistemas TI)'}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                  {d.motivo || 'Baja de usuario solicitada por Sistemas & TI'}
                                </div>
                              </div>
                            </td>

                            {/* Acciones */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                
                                {/* Restaurar */}
                                <button
                                  onClick={() => handleRestaurarUsuario(d)}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                                  title="Restaurar acceso y reactivar usuario en KANT"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restaurar Acceso</span>
                                </button>

                                {/* Purgar */}
                                <button
                                  onClick={() => handlePurgarUsuario(d)}
                                  className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                                  title="Purgar registro definitivamente del historial"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREAR NUEVO USUARIO */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-400">Registra una nueva cuenta con rol y clave personalizada</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Ej: Anthony David Moya"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Nombre de Usuario (@login) *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="Ej: davidmoya"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="david@romanydelgado.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Departamento de Trabajo *
                  </label>
                  <select
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="Legal">Legal (Abogados / Asistentes)</option>
                    <option value="Marketing">Marketing Digital & Contenido</option>
                    <option value="Sistemas">Sistemas & Infraestructura TI</option>
                    <option value="Contabilidad">Contabilidad, Finanzas & SENIAT</option>
                    <option value="Servicios Generales">Servicios Generales & Sede</option>
                    <option value="Administración">Administración & Jefatura</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Rol en la Plataforma *
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="empleado">Colaborador / Empleado</option>
                    <option value="jefatura">Jefatura / Directivo</option>
                    <option value="sistemas">Administrador de Sistemas TI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Contraseña Inicial de Acceso *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Define la contraseña inicial (ej: 123456)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Guardar y Habilitar Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR USUARIO (ROL / DEPARTAMENTO) */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Editar Usuario</h3>
                  <p className="text-xs text-slate-400">@{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Departamento de Trabajo *
                </label>
                <select
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Legal">Legal (Abogados / Asistentes)</option>
                  <option value="Marketing">Marketing Digital & Contenido</option>
                  <option value="Sistemas">Sistemas & Infraestructura TI</option>
                  <option value="Contabilidad">Contabilidad, Finanzas & SENIAT</option>
                  <option value="Servicios Generales">Servicios Generales & Sede</option>
                  <option value="Administración">Administración & Jefatura</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Rol en la Plataforma *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="empleado">Colaborador / Empleado</option>
                  <option value="jefatura">Jefatura / Directivo</option>
                  <option value="sistemas">Administrador de Sistemas TI</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CAMBIAR CLAVE DE ACCESO */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-400">{passwordModalUser.fullName} (@{passwordModalUser.username})</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Nueva Contraseña para este Usuario *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Escribe la nueva clave..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  El usuario podrá iniciar sesión inmediatamente utilizando esta clave en cualquier dispositivo.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <KeyRound className="w-4 h-4" /> Guardar Nueva Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alerta del Sistema */}
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        confirmText={systemAlert.confirmText}
        cancelText={systemAlert.cancelText}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (systemAlert.onConfirm) systemAlert.onConfirm();
          setSystemAlert(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
