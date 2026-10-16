import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, KeyRound, Plus, Edit3, Trash2, Search, 
  X, Eye, EyeOff, UserCheck, Cpu, RefreshCw
} from 'lucide-react';
import { 
  supabaseGetSystemUsers, 
  supabaseSaveSystemUsers, 
  supabaseUpdateUserPassword,
  checkIsSistemas,
  type SystemUser 
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

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await supabaseGetSystemUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

  // Eliminar / Desactivar Usuario
  const handleDeleteUser = (user: SystemUser) => {
    if (user.username === 'victor' || user.username === 'luis' || user.username === 'oscar') {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Acción Bloqueada',
        message: 'No es posible eliminar a los administradores principales del sistema (Víctor, Luis y Óscar).'
      });
      return;
    }

    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: `¿Eliminar a ${user.fullName}?`,
      message: `¿Está seguro de que desea eliminar el usuario de acceso "@${user.username}" de la plataforma KANT?

Consecuencias:
• El usuario ya no podrá iniciar sesión en la intranet ni en computadoras ni en móviles.
• Sus reportes históricos y recibos de nómina previos se conservarán como registro de auditoría.`,
      showCancel: true,
      confirmText: 'Sí, Eliminar Usuario',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        const updated = users.filter(u => u.id !== user.id && u.username.toLowerCase() !== user.username.toLowerCase());
        setUsers(updated);
        await supabaseSaveSystemUsers(updated);
        setSystemAlert({
          isOpen: true,
          type: 'info',
          title: 'Usuario Eliminado',
          message: `El usuario "@${user.username}" fue removido de la plataforma KANT.`
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Usuarios</span>
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
        </div>
      </div>

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

      {/* TABLA DE USUARIOS */}
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
                              title="Eliminar usuario del sistema"
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
