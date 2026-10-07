import { formatTime12h } from './supabaseAdapter';

/**
 * Utilidades para formateo de hora y fecha estilo WhatsApp en chats
 * Román & Delgado | Sistema KANT
 */

export interface ChatMessageMeta {
  timeFormatted: string;     // ej. "12:41 PM"
  dateFormatted: string;     // ej. "Hoy", "Ayer", "28/09/2026"
  fullLabel: string;         // ej. "12:41 PM" (si es hoy) o "28/09/2026 • 12:41 PM"
  dateGroupKey: string;      // ej. "2026-10-07" (para agrupar por día)
  dividerTitle: string;      // ej. "HOY", "AYER", "28 DE SEPTIEMBRE DE 2026"
}

export function formatChatMessageMeta(msg: {
  created_at?: string;
  time?: string;
  fecha?: string;
  fecha_timestamp?: number;
}): ChatMessageMeta {
  let dateObj: Date | null = null;

  // 1. Intentar deducir desde created_at (ISO oficial de Supabase)
  if (msg.created_at) {
    const d = new Date(msg.created_at);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  // 2. Intentar deducir desde fecha_timestamp (segundos unix)
  if (!dateObj && msg.fecha_timestamp) {
    const d = new Date(msg.fecha_timestamp * 1000);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  // 3. Intentar extraer timestamp numérico desde el ID (ej: reply_1728325600_... o 1728325600000)
  if (!dateObj && (msg as any).id) {
    const parts = String((msg as any).id).split('_');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 1600000000) {
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          dateObj = d;
          break;
        }
      }
    }
  }

  // 4. Intentar deducir desde msg.fecha
  if (!dateObj && msg.fecha) {
    if (msg.fecha.includes('T')) {
      const d = new Date(msg.fecha);
      if (!isNaN(d.getTime())) dateObj = d;
    } else {
      const match = msg.fecha.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const timePart = msg.time || '12:00';
        const d = new Date(`${match[1]}T${timePart.padStart(5, '0')}:00`);
        if (!isNaN(d.getTime())) dateObj = d;
      }
    }
  }

  let timeFormatted = '';
  let dateFormatted = '';
  let dateGroupKey = '';
  let dividerTitle = '';

  if (dateObj) {
    // Formato 12 horas oficial con AM / PM: ej. "12:41 PM", "06:51 PM"
    timeFormatted = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    dateGroupKey = `${y}-${m}-${d}`;

    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();

    if (isToday) {
      dateFormatted = 'Hoy';
      dividerTitle = 'HOY';
    } else if (isYesterday) {
      dateFormatted = 'Ayer';
      dividerTitle = 'AYER';
    } else {
      dateFormatted = `${d}/${m}/${y}`;
      try {
        dividerTitle = dateObj.toLocaleDateString('es-VE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).toUpperCase();
      } catch {
        dividerTitle = `${d}/${m}/${y}`;
      }
    }
  } else {
    // Si no se pudo parsear Date, usar respaldos
    timeFormatted = msg.time ? formatTime12h(msg.time) : '';
    dateFormatted = msg.fecha || '';
    dateGroupKey = msg.fecha || 'reciente';
    dividerTitle = dateFormatted ? dateFormatted.toUpperCase() : 'MENSAJES';
  }

  // Si timeFormatted está vacío pero msg.time existe
  if (!timeFormatted && msg.time) {
    timeFormatted = formatTime12h(msg.time);
  }

  // Si msg.fecha contiene la hora incrustada (ej. "7 oct, 12:41 p. m.")
  if (!timeFormatted && msg.fecha) {
    const timeMatch = msg.fecha.match(/(\d{1,2}:\d{2}(?:\s*[ap]m)?)/i);
    if (timeMatch) {
      timeFormatted = formatTime12h(timeMatch[1]);
    }
  }

  // Label conciso estilo WhatsApp para la esquina inferior de la burbuja:
  // - Si es de Hoy: Solo la hora (ej: "12:41 PM")
  // - Si es de Ayer: "Ayer • 06:51 PM"
  // - Si es de otro día: "28/09/2026 • 04:15 PM"
  let fullLabel = '';
  if (dateFormatted === 'Hoy') {
    fullLabel = timeFormatted || 'Hoy';
  } else if (dateFormatted === 'Ayer') {
    fullLabel = timeFormatted ? `Ayer • ${timeFormatted}` : 'Ayer';
  } else if (dateFormatted) {
    fullLabel = timeFormatted ? `${dateFormatted} • ${timeFormatted}` : dateFormatted;
  } else {
    fullLabel = timeFormatted || 'Reciente';
  }

  return {
    timeFormatted: timeFormatted || fullLabel,
    dateFormatted,
    fullLabel,
    dateGroupKey,
    dividerTitle
  };
}
