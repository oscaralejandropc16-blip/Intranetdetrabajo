import type { FestiveThemeId } from '../../lib/themeManager';
import type { TipoDisfrazKant } from '../../lib/efemeridesVenezuela';

interface KantCostumeOverlayProps {
  theme: FestiveThemeId;
  costumeType?: TipoDisfrazKant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isExcited?: boolean;
}

export default function KantCostumeOverlay({
  theme,
  costumeType,
  size = 'sm',
  isExcited = false
}: KantCostumeOverlayProps) {
  const isChocolate = theme === 'chocolate' || costumeType === 'chocolate';
  const isHalloween = theme === 'halloween' || costumeType === 'halloween';
  const isAbogado = theme === 'abogado' || costumeType === 'abogado';
  const isNavidad = theme === 'navidad' || costumeType === 'navidad';
  const isPatria = theme === 'patria' || costumeType === 'patria';

  if (!isChocolate && !isHalloween && !isAbogado && !isNavidad && !isPatria) {
    return null;
  }

  // Escala según tamaño
  const scaleClass = {
    sm: 'scale-[0.85]',
    md: 'scale-100',
    lg: 'scale-125',
    xl: 'scale-150'
  }[size];

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-20 ${scaleClass}`}>
      {/* 🎃 1. ATUENDO PROFESIONAL DE HALLOWEEN */}
      {isHalloween && (
        <>
          {/* Sombrero de Bruja Elegante (sobre la oreja derecha de Kant) */}
          <div 
            className={`absolute -top-3.5 right-0.5 sm:-top-4 sm:right-1 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)] ${
              isExcited ? 'animate-bounce' : 'animate-float-slow'
            }`}
          >
            <svg 
              viewBox="0 0 100 100" 
              className="w-7 h-7 sm:w-8 sm:h-8 filter drop-shadow-md overflow-visible"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Cono del sombrero morado oscuro con pliegue */}
              <path 
                d="M 50 10 Q 56 12 52 28 Q 62 48 68 62 L 28 62 Q 35 48 45 28 Z" 
                fill="url(#witchConeGrad)" 
              />
              {/* Punta doblada caprichosa */}
              <path 
                d="M 50 10 Q 55 5 62 8 Q 60 14 52 14 Z" 
                fill="#4c1d95" 
              />
              {/* Ala ancha curva del sombrero */}
              <ellipse 
                cx="48" 
                cy="62" 
                rx="34" 
                ry="8" 
                fill="#2e1065" 
                stroke="#581c87" 
                strokeWidth="1.5" 
              />
              {/* Cinta naranja calabaza */}
              <path 
                d="M 32 58 Q 48 64 64 58 L 65 62 Q 48 68 31 62 Z" 
                fill="#ea580c" 
              />
              {/* Hebilla dorada brillante */}
              <rect 
                x="44" 
                y="57" 
                width="8" 
                height="6" 
                rx="1.5" 
                fill="#f59e0b" 
                stroke="#78350f" 
                strokeWidth="1" 
              />
              <rect 
                x="46" 
                y="58.5" 
                width="4" 
                height="3" 
                fill="#ea580c" 
              />

              {/* Degradados */}
              <defs>
                <linearGradient id="witchConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6b21a8" />
                  <stop offset="60%" stopColor="#3b0764" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Calabacita Jack-o'-lantern brillante junto a las patitas */}
          <div className="absolute -bottom-1 -left-1 sm:-bottom-1.5 sm:-left-1.5 transition-transform duration-300 drop-shadow-[0_2px_6px_rgba(234,88,12,0.6)]">
            <svg 
              viewBox="0 0 60 60" 
              className="w-5 h-5 sm:w-6 sm:h-6 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tallito verde */}
              <path d="M 30 14 Q 34 8 36 10 Q 32 15 31 16 Z" fill="#15803d" stroke="#166534" strokeWidth="1" />
              {/* Cuerpo de calabaza */}
              <ellipse cx="30" cy="34" rx="19" ry="16" fill="url(#pumpkinGrad)" stroke="#c2410c" strokeWidth="1.2" />
              <ellipse cx="25" cy="34" rx="14" ry="15" fill="#f97316" opacity="0.35" />
              <ellipse cx="35" cy="34" rx="14" ry="15" fill="#ea580c" opacity="0.3" />
              {/* Ojos y sonrisa tallada iluminada */}
              <polygon points="23,28 27,28 25,24" fill="#fef08a" />
              <polygon points="33,28 37,28 35,24" fill="#fef08a" />
              <polygon points="30,32 32,34 28,34" fill="#fef08a" />
              {/* Sonrisa zig-zag */}
              <path d="M 21 38 Q 30 46 39 38 Q 36 43 30 43 Q 24 43 21 38 Z" fill="#fef08a" />
              
              <defs>
                <linearGradient id="pumpkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="60%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#9a3412" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}

      {/* ⚖️ 2. ATUENDO DE ALTA CORTE - DÍA DEL ABOGADO */}
      {isAbogado && (
        <>
          {/* Birrete de Grado Académico / Abogado */}
          <div 
            className={`absolute -top-3.5 left-1/2 -translate-x-1/2 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              isExcited ? 'animate-bounce' : 'animate-pulse'
            }`}
            style={{ animationDuration: '4s' }}
          >
            <svg 
              viewBox="0 0 100 70" 
              className="w-8 h-8 sm:w-9 sm:h-9 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Casquete inferior */}
              <path d="M 36 34 Q 50 44 64 34 L 62 46 Q 50 54 38 46 Z" fill="#0f172a" stroke="#d97706" strokeWidth="0.8" />
              {/* Tapa romboide superior */}
              <polygon points="50,12 85,28 50,44 15,28" fill="url(#birreteGrad)" stroke="#f59e0b" strokeWidth="1.5" />
              {/* Botón central dorado */}
              <circle cx="50" cy="28" r="2.5" fill="#f59e0b" />
              {/* Borla dorada que cuelga elegante */}
              <path d="M 50 28 Q 66 30 72 40" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
              <ellipse cx="72" cy="43" rx="2.5" ry="4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />

              <defs>
                <linearGradient id="birreteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Balanza de la Justicia Dorada al pie */}
          <div className="absolute -bottom-1.5 -right-1 sm:-bottom-2 sm:-right-1.5 drop-shadow-[0_2px_8px_rgba(245,158,11,0.65)]">
            <svg 
              viewBox="0 0 60 60" 
              className="w-5 h-5 sm:w-6 sm:h-6 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Columna central y base */}
              <path d="M 22 52 L 38 52" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="30" y1="52" x2="30" y2="18" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="30" cy="18" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
              {/* Brazo horizontal equilibrado */}
              <line x1="12" y1="23" x2="48" y2="23" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
              {/* Platillo izquierdo */}
              <line x1="14" y1="23" x2="10" y2="34" stroke="#d97706" strokeWidth="1" />
              <line x1="14" y1="23" x2="18" y2="34" stroke="#d97706" strokeWidth="1" />
              <path d="M 8 34 Q 14 39 20 34 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
              {/* Platillo derecho */}
              <line x1="46" y1="23" x2="42" y2="34" stroke="#d97706" strokeWidth="1" />
              <line x1="46" y1="23" x2="50" y2="34" stroke="#d97706" strokeWidth="1" />
              <path d="M 40 34 Q 46 39 52 34 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
            </svg>
          </div>
        </>
      )}

      {/* 🎄 3. ATUENDO NAVIDEÑO - GORRO DE SANTA */}
      {isNavidad && (
        <>
          {/* Gorro de Santa Rojo con Pompón Blanco */}
          <div 
            className={`absolute -top-3.5 right-0 sm:-top-4 sm:right-0.5 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] ${
              isExcited ? 'animate-bounce' : 'animate-float-slow'
            }`}
          >
            <svg 
              viewBox="0 0 100 80" 
              className="w-7 h-7 sm:w-8 sm:h-8 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Cono rojo terciopelo caído a la derecha */}
              <path 
                d="M 30 52 Q 40 20 62 16 Q 80 20 78 36 Q 74 46 80 48 L 76 52 Z" 
                fill="url(#santaRedGrad)" 
              />
              {/* Borde afelpado blanco */}
              <rect x="22" y="48" width="56" height="12" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              {/* Pompón blanco suave */}
              <circle cx="83" cy="50" r="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />

              <defs>
                <linearGradient id="santaRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="60%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Arbolito o corona al pie */}
          <div className="absolute -bottom-1 -left-1 drop-shadow-[0_2px_6px_rgba(16,185,129,0.5)]">
            <span className="text-sm sm:text-base">🎄</span>
          </div>
        </>
      )}

      {/* 🇻🇪 4. ATUENDO PATRIO - TRICOLOR VENEZOLANO */}
      {isPatria && (
        <>
          {/* Escarapela con Estrellas y Laurel en la cabeza */}
          <div className="absolute -top-3 right-0 drop-shadow-[0_2px_8px_rgba(250,204,21,0.7)] animate-pulse">
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600 p-0.5 border border-amber-300 shadow-md flex items-center justify-center">
              <span className="text-[10px] text-white font-black leading-none drop-shadow-sm">⭐</span>
            </div>
          </div>

          {/* Banda Presidencial Tricolor */}
          <div className="absolute -bottom-1 -left-1 drop-shadow-md">
            <span className="text-sm sm:text-base">🇻🇪</span>
          </div>
        </>
      )}

      {/* 🍫 5. ATUENDO Y TABLETA DE CHOCOLATE - DÍA DEL CACAO Y CHOCOLATE VENEZOLANO */}
      {isChocolate && (
        <>
          {/* Gorro de Maestro Chocolatero francés / pastelero sobre la cabeza de Kant */}
          <div 
            className={`absolute -top-3.5 right-0 sm:-top-4 sm:right-0.5 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] ${
              isExcited ? 'animate-bounce' : 'animate-float-slow'
            }`}
          >
            <svg 
              viewBox="0 0 100 80" 
              className="w-7 h-7 sm:w-8 sm:h-8 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Pliegues abullonados del gorro blanco de chocolatero */}
              <path 
                d="M 28 50 C 20 40 22 25 38 20 C 42 12 58 10 65 18 C 76 15 84 26 80 40 C 85 46 80 52 75 52 L 25 52 Z" 
                fill="url(#toqueWhiteGrad)" 
                stroke="#cbd5e1" 
                strokeWidth="1.2" 
              />
              {/* Banda de la base marrón cacao con ribete dorado */}
              <rect x="25" y="48" width="52" height="8" rx="2" fill="#451a03" stroke="#d97706" strokeWidth="1" />
              {/* Grano de cacao dorado central */}
              <ellipse cx="51" cy="52" rx="3.5" ry="2.2" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
              <path d="M 48.5 52 Q 51 51 53.5 52" stroke="#78350f" strokeWidth="0.8" fill="none" />

              <defs>
                <linearGradient id="toqueWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Tableta de Chocolate Gourmet siendo saboreada por Kant */}
          <div 
            className={`absolute -bottom-2 -right-1 sm:-bottom-2.5 sm:-right-1.5 transition-transform duration-300 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] ${
              isExcited ? 'scale-110 rotate-6 animate-pulse' : 'hover:scale-105'
            }`}
          >
            <svg 
              viewBox="0 0 70 85" 
              className="w-7 h-8 sm:w-8 sm:h-9 overflow-visible" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tableta de chocolate oscuro base */}
              <rect x="12" y="10" width="46" height="65" rx="3" fill="#2d1305" />
              
              {/* Parte superior de chocolate al descubierto (4 cuadritos) */}
              <g id="chocolateSquares">
                {/* Cuadro superior izquierdo */}
                <rect x="15" y="13" width="18" height="15" rx="1.5" fill="url(#chocoSquareGrad)" stroke="#1a0a03" strokeWidth="0.6" />
                <rect x="17" y="15" width="14" height="11" rx="1" fill="#4a220c" opacity="0.6" />
                
                {/* Cuadro superior derecho CON MORDISCO de perrito */}
                <path 
                  d="M 37 13 L 52 13 C 53 13 54 14 54 15 L 54 28 L 37 28 Z" 
                  fill="url(#chocoSquareGrad)" 
                  stroke="#1a0a03" 
                  strokeWidth="0.6" 
                />
                {/* Bocado / mordida curva en la esquina */}
                <path 
                  d="M 44 12 C 43 17 48 21 54 18 L 55 12 Z" 
                  fill="#0b0f19" 
                  opacity="0.95"
                />
                
                {/* Cuadro inferior izquierdo */}
                <rect x="15" y="30" width="18" height="14" rx="1.5" fill="url(#chocoSquareGrad)" stroke="#1a0a03" strokeWidth="0.6" />
                
                {/* Cuadro inferior derecho */}
                <rect x="37" y="30" width="18" height="14" rx="1.5" fill="url(#chocoSquareGrad)" stroke="#1a0a03" strokeWidth="0.6" />
              </g>

              {/* Migajitas crujientes flotantes del mordisco */}
              <circle cx="51" cy="9" r="1.5" fill="#78350f" />
              <circle cx="56" cy="14" r="1.2" fill="#92400e" />
              <circle cx="47" cy="7" r="0.9" fill="#f59e0b" />

              {/* Papel de Envoltura Dorado (Golden Foil) arrugado artesanal */}
              <path 
                d="M 10 40 Q 22 43 35 39 Q 48 44 60 41 L 58 75 Q 35 77 12 75 Z" 
                fill="url(#goldFoilChocoGrad)" 
                stroke="#b45309" 
                strokeWidth="0.8" 
              />
              {/* Pliegue de envoltura brillante */}
              <path 
                d="M 10 40 L 16 45 L 26 41 L 38 46 L 49 42 L 60 41 L 57 47 L 12 47 Z" 
                fill="#fde68a" 
                opacity="0.6" 
              />
              
              {/* Cintillo de etiqueta venezolana: Cacao Chuao 100% */}
              <rect x="11" y="52" width="48" height="14" fill="#78350f" stroke="#d97706" strokeWidth="0.6" />
              <text x="35" y="60" textAnchor="middle" fill="#fef08a" fontSize="5.5" fontWeight="900" letterSpacing="0.4" fontFamily="sans-serif">
                CACAO VE
              </text>
              <text x="35" y="64.5" textAnchor="middle" fill="#ffffff" fontSize="3.8" fontWeight="bold" letterSpacing="0.2" fontFamily="sans-serif">
                CHUAO 100%
              </text>

              {/* Degradados */}
              <defs>
                <linearGradient id="chocoSquareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5c2b10" />
                  <stop offset="50%" stopColor="#431e0a" />
                  <stop offset="100%" stopColor="#291206" />
                </linearGradient>
                <linearGradient id="goldFoilChocoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
