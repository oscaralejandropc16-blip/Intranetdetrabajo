import base64
import os

scratch_dir = r'C:\Users\Laptop\.gemini\antigravity-ide\brain\cbdae822-fecb-4062-9fff-bb5d5f74a6db\scratch'
brain_dir = r'C:\Users\Laptop\.gemini\antigravity-ide\brain\cbdae822-fecb-4062-9fff-bb5d5f74a6db'

def get_b64(path):
    if not path or not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

logo_b64 = get_b64(os.path.join(scratch_dir, 'official_logo.png'))

steps = [
    {
        "title": "FICHAJE (Entrada/Salida)",
        "desc": "Marque su hora de entrada y salida diariamente para registrar su asistencia y cumplir con la jornada oficial.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
    },
    {
        "title": "LIBRO DE ACTUACIONES",
        "desc": "Registre cada tarea procesal o administrativa en su bitácora. Al final del día, se enviará como su reporte de trabajo a Jefatura.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'
    },
    {
        "title": "BUZÓN DE INSTRUCCIONES",
        "desc": "Bandeja de entrada oficial para recibir directrices directas, asignación de tareas urgentes y mensajes de Jefatura.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>'
    },
    {
        "title": "CHAT EN TIEMPO REAL",
        "desc": "Comuníquese directamente con sus superiores desde cada tarea asignada para reportar progresos o aclarar dudas procesales.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
    },
    {
        "title": "LIBRO DE INGRESOS",
        "desc": "Gestión financiera de los casos. Registre de forma detallada honorarios, facturaciones y transferencias de clientes.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
    },
    {
        "title": "PROGRAMACIÓN",
        "desc": "Agenda corporativa para organizar audiencias, reuniones y evitar la preclusión de plazos procesales.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>'
    },
    {
        "title": "HISTORIAL",
        "desc": "Archivo seguro de todas sus bitácoras pasadas para consulta inmediata de actuaciones enviadas en fechas previas.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>'
    },
    {
        "title": "BIBLIOTECA JURÍDICA",
        "desc": "Repositorio central de doctrina, jurisprudencia y modelos de contratos a disposición de todos los abogados de la firma.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
    },
    {
        "title": "EXPEDIENTES",
        "desc": "Directorio maestro de causas. Registre de inmediato los avances, incidencias y cambios procesales de sus casos asignados.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
    },
    {
        "title": "CONTROL DE GASTOS",
        "desc": "Módulo de rendición de cuentas para reportar traslados, aranceles y copias, requiriendo siempre respaldo fotográfico.",
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>'
    }
]

steps_html = ""
for i, step in enumerate(steps, 1):
    steps_html += f'''
            <div class="card">
                <div class="card-icon">{step["icon"]}</div>
                <div class="card-number">0{i}</div>
                <h3 class="card-title">{step["title"]}</h3>
                <p class="card-desc">{step["desc"]}</p>
            </div>'''

html_content = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1100, initial-scale=1.0">
    <title>Plataforma KANT - Infografía</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        html, body {{
            margin: 0;
            padding: 0;
            background-color: #030712;
        }}
        body {{
            font-family: 'Montserrat', sans-serif;
            color: #f8fafc;
            width: 1040px;
        }}
        .infographic {{
            width: 100%;
            background: linear-gradient(180deg, #050b14 0%, #030712 100%);
            position: relative;
            overflow: hidden;
        }}
        
        .header {{
            text-align: center;
            padding: 70px 50px 50px 50px;
            position: relative;
            z-index: 1;
        }}
        .logo {{ height: 110px; max-width: 280px; object-fit: contain; margin-bottom: 25px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); }}
        .badge {{
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(217, 160, 91, 0.1); border: 1px solid rgba(217, 160, 91, 0.4);
            color: #d9a05b; font-size: 13px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;
            padding: 8px 20px; border-radius: 999px; margin-bottom: 25px;
        }}
        .title {{ font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 700; color: #ffffff; margin-bottom: 15px; letter-spacing: -0.5px; }}
        .title span {{ color: #d9a05b; }}
        .desc {{ font-size: 18px; color: #94a3b8; max-width: 700px; margin: 0 auto; line-height: 1.6; }}
        
        .grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 25px;
            padding: 0 50px 60px 50px;
            position: relative;
            z-index: 1;
        }}
        
        .card {{
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(217, 160, 91, 0.15);
            border-radius: 24px;
            padding: 35px 30px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }}
        .card::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(217, 160, 91, 0.05) 0%, transparent 50%);
            z-index: 0;
        }}
        .card > * {{ position: relative; z-index: 1; }}
        
        .card-number {{
            position: absolute;
            top: 20px;
            right: 25px;
            font-size: 64px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.03);
            line-height: 1;
            z-index: 0;
        }}
        .card-icon {{
            width: 50px;
            height: 50px;
            color: #d9a05b;
            margin-bottom: 20px;
        }}
        .card-title {{
            font-size: 19px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 12px;
            letter-spacing: -0.3px;
            text-transform: uppercase;
        }}
        .card-desc {{
            font-size: 15px;
            color: #cbd5e1;
            line-height: 1.6;
        }}
        
        .footer {{
            padding: 40px 50px;
            background: #02040a;
            border-top: 1px solid rgba(217, 160, 91, 0.1);
            text-align: center;
            font-size: 14px;
            color: #64748b;
        }}
        .footer-brand {{
            color: #e2e8f0; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px; font-size: 16px;
        }}
        .footer-brand span {{ color: #d9a05b; }}
    </style>
</head>
<body>
    <div class="infographic">
        <div class="header">
            <img src="{logo_b64}" class="logo">
            <br>
            <div class="badge">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                ECOSISTEMA DIGITAL
            </div>
            <h1 class="title">Flujo Operativo — Plataforma <span>KANT</span></h1>
            <p class="desc">Conozca los 10 pilares fundamentales para el correcto manejo de la Intranet Corporativa y la gestión procesal diaria.</p>
        </div>
        
        <div class="grid">
            {steps_html}
        </div>
        
        <div class="footer">
            <div class="footer-brand">ROMÁN & DELGADO | <span>DESPACHO DE ABOGADOS</span></div>
            <div>Uso Interno y Confidencial • Acceso Corporativo Oficial</div>
        </div>
    </div>
</body>
</html>'''

target_file = os.path.join(scratch_dir, 'flyer_capturas_reales.html')
with open(target_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(os.path.join(brain_dir, 'flyer.html'), 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'Wrote new infographic flyer successfully.')
