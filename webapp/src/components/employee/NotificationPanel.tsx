import { MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  sender: string;
  read: boolean;
}

interface NotificationPanelProps {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
}

export default function NotificationPanel({ notifications, setNotifications }: NotificationPanelProps) {
  const handleMarkAsRead = (id: number) => {
    const newNotifs = notifications.map(n => {
      if (n.id === id) {
        localStorage.setItem(`rd_notif_read_${n.id}_${n.title}`, 'true');
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(newNotifs);
  };

  const unreadList = notifications.filter(n => !n.read);
  const readList = notifications.filter(n => n.read);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: MENSAJES PENDIENTES */}
      {unreadList.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            Nuevas Instrucciones / Feedback Pendiente ({unreadList.length})
          </h4>
          {unreadList.map((notif, idx) => (
            <div 
              key={notif.id} 
              className={`border-2 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-md transition-all ${
                notif.type === 'feedback' ? 'bg-blue-50/90 border-blue-300' : 'bg-amber-50/90 border-amber-300'
              }`} 
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                notif.type === 'feedback' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-slate-900'
              }`}>
                {notif.type === 'feedback' ? <MessageSquare className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-blue-200/80 text-blue-900 text-[10px] font-black uppercase tracking-wider rounded-full">
                    NUEVO MENSAJE
                  </span>
                </div>
                <h3 className={`text-xl font-black mb-1.5 ${notif.type === 'feedback' ? 'text-blue-950' : 'text-amber-950'}`}>{notif.title}</h3>
                <p className={`text-base font-medium leading-relaxed ${notif.type === 'feedback' ? 'text-blue-900' : 'text-amber-900'}`}>{notif.message}</p>
                <p className={`text-xs font-bold uppercase tracking-wider mt-3 ${notif.type === 'feedback' ? 'text-blue-600' : 'text-amber-600'}`}>Emisor: {notif.sender}</p>
              </div>
              <button 
                onClick={() => handleMarkAsRead(notif.id)}
                className={`flex-shrink-0 px-6 py-3.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 ${
                  notif.type === 'feedback' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Marcar como leído
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SECCIÓN 2: HISTORIAL DE MENSAJES LEÍDOS */}
      {readList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            Historial de Instrucciones Leídas ({readList.length})
          </h4>
          {readList.map((notif) => (
            <div 
              key={notif.id} 
              className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row gap-5 items-start md:items-center opacity-85 hover:opacity-100 transition-opacity" 
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                    ✓ Leído
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">{notif.title}</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{notif.message}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">Emisor: {notif.sender}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
