import React from 'react';

const COLORS = {
  base: '#0D0B08',
  surface: '#141009',
  elevated: '#1C160D',
  borderUmber: '#2A2015',
  borderHairline: '#3A2D1C',
  textPrimary: '#F0E8D5',
  textSecondary: '#A8997B',
  textMuted: '#7A6A50',
  amber: '#FFB12B',
  amberPress: '#E0920C',
  amberGlow: '#FFCB6B',
  signalOrange: '#FF5E00',
  lightChip: '#F0E8D5',
};

const Tagline = () => (
  <div className="text-[0.6rem] tracking-[0.2em] uppercase mt-1" style={{ color: COLORS.textMuted, fontFamily: 'Inter' }}>
    Growth Cartography
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase tracking-widest font-['JetBrains_Mono'] mb-3" style={{ color: COLORS.textMuted }}>
    {children}
  </div>
);

// Concept 1: True North Compass
const CompassMark = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
    <circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" opacity="0.5" />
    <path d="M50 5 L50 95 M5 50 L95 50" stroke={color} strokeWidth="1" opacity="0.5" />
    <path d="M50 15 L58 42 L85 50 L58 58 L50 85 L42 58 L15 50 L42 42 Z" fill={color} />
    <circle cx="50" cy="50" r="6" fill={COLORS.base} />
  </svg>
);

// Concept 2: False Dawn, bold dawn circle (primary mark)
const HorizonMark = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Open ring over the horizon */}
    <path d="M12 50 A38 38 0 0 1 88 50" stroke={color} strokeWidth="7" fill="none" />
    {/* Solid lower half, the false dawn rising */}
    <path d="M12 50 A38 38 0 0 0 88 50 Z" fill={color} />
  </svg>
);

// Concept 3: Network Constellation
const NetworkMark = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 30 L50 15 L75 40 L60 75 L30 65 Z" stroke={color} strokeWidth="2" opacity="0.4" />
    <path d="M50 15 L60 75 M25 30 L75 40 M30 65 L50 45 L75 40 M25 30 L50 45 L60 75" stroke={color} strokeWidth="1" opacity="0.3" />
    <circle cx="50" cy="15" r="4" fill={color} />
    <circle cx="25" cy="30" r="5" fill={color} />
    <circle cx="75" cy="40" r="6" fill={color} />
    <circle cx="60" cy="75" r="4" fill={color} />
    <circle cx="30" cy="65" r="4" fill={color} />
    <circle cx="50" cy="45" r="7" fill={color} />
    <circle cx="50" cy="45" r="2" fill={COLORS.base} />
  </svg>
);

// Concept 4: FDI Monogram Grid
const MonogramMark = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {Array.from({ length: 9 }).map((_, i) => (
      <path key={`v-${i}`} d={`M${10 + i * 10} 10 L${10 + i * 10} 90`} stroke={color} strokeWidth="1" opacity="0.1" />
    ))}
    {Array.from({ length: 9 }).map((_, i) => (
      <path key={`h-${i}`} d={`M10 ${10 + i * 10} L90 ${10 + i * 10}`} stroke={color} strokeWidth="1" opacity="0.1" />
    ))}
    {/* F */}
    <rect x="20" y="20" width="10" height="60" fill={color} />
    <rect x="30" y="20" width="20" height="10" fill={color} />
    <rect x="30" y="40" width="15" height="10" fill={color} />
    {/* D */}
    <rect x="60" y="20" width="10" height="60" fill={color} />
    <path d="M70 20 H80 C85 20 90 25 90 35 V65 C90 75 85 80 80 80 H70 V20 Z" fill={color} />
    <path d="M70 30 H75 C78 30 80 32 80 35 V65 C80 68 78 70 75 70 H70 V30 Z" fill={COLORS.base} />
  </svg>
);

interface ConceptCardProps {
  title: string;
  description: string;
  Mark: React.FC<{ size: number; color: string }>;
  markColor?: string;
  primary?: boolean;
}

const ConceptCard = ({ title, description, Mark, markColor = COLORS.amber, primary = false }: ConceptCardProps) => {
  return (
    <div className="flex flex-col border border-solid" style={{ borderColor: primary ? COLORS.amber : COLORS.borderHairline, backgroundColor: COLORS.surface }}>
      <div className="relative p-8 border-b border-solid flex flex-col items-center justify-center min-h-[300px]" style={{ borderColor: COLORS.borderHairline }}>
        {primary && (
          <span className="absolute top-4 right-4 text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest px-2 py-1" style={{ color: COLORS.base, backgroundColor: COLORS.amber }}>
            Primary
          </span>
        )}
        <Label>Primary Mark</Label>
        <div className="flex-1 flex items-center justify-center">
          <Mark size={120} color={markColor} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-solid" style={{ borderColor: COLORS.borderHairline }}>
        <div className="p-8 flex flex-col items-center justify-center">
          <Label>Full Lockup</Label>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-right">
              <div className="font-['Space_Grotesk'] text-xl tracking-wider uppercase" style={{ color: COLORS.textPrimary }}>
                False Dawn Industries
              </div>
              <Tagline />
            </div>
            <Mark size={48} color={markColor} />
          </div>
        </div>

        <div className="grid grid-rows-2 divide-y divide-solid" style={{ borderColor: COLORS.borderHairline }}>
          <div className="p-6 flex flex-col items-center justify-center">
            <Label>Legibility Scale</Label>
            <div className="flex items-end gap-8 mt-2">
              <div className="flex flex-col items-center gap-2">
                <Mark size={32} color={markColor} />
                <span className="text-[10px] font-['JetBrains_Mono']" style={{ color: COLORS.textMuted }}>32px</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Mark size={16} color={markColor} />
                <span className="text-[10px] font-['JetBrains_Mono']" style={{ color: COLORS.textMuted }}>16px</span>
              </div>
            </div>
          </div>
          <div className="flex divide-x divide-solid" style={{ borderColor: COLORS.borderHairline }}>
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-black/20">
              <Label>Dark Base</Label>
              <div className="mt-2">
                <Mark size={40} color={markColor} />
              </div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center" style={{ backgroundColor: COLORS.lightChip }}>
              <Label>Light Chip</Label>
              <div className="mt-2">
                <Mark size={40} color={COLORS.base} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-solid" style={{ borderColor: COLORS.borderHairline, backgroundColor: COLORS.elevated }}>
        <h3 className="font-['Space_Grotesk'] text-lg mb-2" style={{ color: COLORS.textPrimary }}>{title}</h3>
        <p className="font-['Inter'] text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>{description}</p>
      </div>
    </div>
  );
};

export function LogoConcepts() {
  return (
    <div className="min-h-screen p-8 md:p-12 lg:p-24 w-full max-w-[1400px] mx-auto font-['Inter']" style={{ backgroundColor: COLORS.base, color: COLORS.textPrimary }}>
      <header className="mb-16 max-w-2xl">
        <div className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase mb-4" style={{ color: COLORS.amber }}>
          Board 02 // Visual Identity
        </div>
        <h1 className="font-['Space_Grotesk'] text-4xl md:text-5xl tracking-tight mb-6" style={{ color: COLORS.textPrimary }}>
          Cartographic Precision
        </h1>
        <p className="text-lg leading-relaxed" style={{ color: COLORS.textSecondary }}>
          A precision navigational instrument that helps a growth marketer chart their bearings in unmapped marketplaces where human and machine dynamics collide.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
        <ConceptCard 
          title="Concept 01: True North Compass"
          description="A reimagined compass rose focusing on trajectory and true north. The outer dashed ring suggests data boundaries, while the solid inner structure provides a grounded center."
          Mark={CompassMark}
        />
        <ConceptCard 
          title="Concept 02: Dawn Mark (Primary)"
          description="The chosen identity: a bold false dawn breaking over the horizon, a solid lower half rising into an open ring. Rendered in Signal Orange so the mark cuts through at any size, while amber leads the action layer across the rest of the system."
          Mark={HorizonMark}
          markColor={COLORS.signalOrange}
          primary
        />
        <ConceptCard 
          title="Concept 03: Node Constellation"
          description="Mapping the unknown. A network graph that forms a structural beacon. Abstract, highly technical, and implies complex relationships being distilled into a single point of truth."
          Mark={NetworkMark}
        />
        <ConceptCard 
          title="Concept 04: Blueprint Monogram"
          description="A highly structured, grid-based monogram integrating 'F' and 'D'. It feels like an architectural drawing or a technical schematic, reinforcing the 'instrument-grade' tone."
          Mark={MonogramMark}
        />
      </div>
      
      <footer className="mt-24 pt-8 border-t border-solid text-center font-['JetBrains_Mono'] text-xs" style={{ borderColor: COLORS.borderHairline, color: COLORS.textMuted }}>
        False Dawn Industries // Brand Exploration // {new Date().getFullYear()}
      </footer>
    </div>
  );
}
