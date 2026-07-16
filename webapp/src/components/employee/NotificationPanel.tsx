import { MessageSquare, AlertCircle } from 'lucide-react';

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
  const unreadNotifications = notifications.filter(n => !n.read);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="space-y-4">
      {unreadNotifications.map((notif, idx) => (
        <div 
          key={notif.id} 
          className={`border rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-sm animate-in fade-in slide-in-from-bottom-4 ${notif.type === 'feedback' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`} 
          style={{animationDelay: `${idx * 150}ms`}}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'feedback' ? 'bg-blue-100' : 'bg-amber-100'}`}>
            {notif.type === 'feedback' ? <MessageSquare className="w-7 h-7 text-blue-600" /> : <AlertCircle className="w-7 h-7 text-amber-600" />}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-1 ${notif.type === 'feedback' ? 'text-blue-900' : 'text-amber-900'}`}>{notif.title}</h3>
            <p className={`font-medium ${notif.type === 'feedback' ? 'text-blue-800' : 'text-amber-800'}`}>{notif.message}</p>
            <p className={`text-xs font-bold uppercase tracking-wider mt-2 ${notif.type === 'feedback' ? 'text-blue-500' : 'text-amber-500'}`}>{notif.sender}</p>
          </div>
          <button 
            onClick={() => {
              const newNotifs = [...notifications];
              const target = newNotifs.find(n => n.id === notif.id);
              if (target) target.read = true;
              setNotifications(newNotifs);
            }}
            className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5 ${notif.type === 'feedback' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}
          >
            Marcar como leído
          </button>
        </div>
      ))}
    </div>
  );
}
