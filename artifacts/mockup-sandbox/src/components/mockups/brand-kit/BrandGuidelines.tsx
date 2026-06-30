import React from "react";
import "./_group.css";

export function BrandGuidelines() {
  return (
    <div className="brand-kit-root brand-kit-bg-base min-h-screen w-full flex justify-center py-16 px-8 font-['Inter']">
      <div className="max-w-[1280px] w-full flex flex-col gap-16">
        
        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-[#2A2015] pb-12">
          <div className="flex justify-between items-end">
            <h1 className="font-['Space_Grotesk'] text-5xl font-medium tracking-tight brand-kit-text-primary">
              False Dawn Industries
            </h1>
            <div className="brand-kit-text-signal font-['JetBrains_Mono'] text-sm uppercase tracking-wider">
              Brand System // v1.0.0
            </div>
          </div>
          <div>
            <h2 className="font-['Space_Grotesk'] text-2xl brand-kit-text-primary mb-2">
              Concept: Cartographic Precision
            </h2>
            <p className="brand-kit-text-secondary text-lg max-w-3xl leading-relaxed">
              A precision navigational instrument that helps a growth marketer chart their bearings in unmapped marketplaces where human and machine dynamics collide.
            </p>
          </div>
        </header>

        {/* Color Rules */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-['Space_Grotesk'] text-xl brand-kit-text-primary uppercase tracking-widest text-sm border-b border-[#3A2D1C] pb-4">
              01 // Color Architecture
            </h3>
            <p className="brand-kit-text-secondary max-w-2xl mt-4">
              The palette is constrained and functional. Backgrounds provide a warm, dark canvas. The identity runs two-tone: Signal Orange belongs to the logo mark alone, while Signal Amber is reserved for signal, action, and key data — never used for large fills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Backgrounds */}
            <div className="flex flex-col gap-4">
              <h4 className="brand-kit-text-primary font-medium">Backgrounds & Surfaces</h4>
              <div className="flex flex-col gap-2">
                <ColorSwatch name="Base (Parchment Night)" hex="#0D0B08" bgClass="bg-[#0D0B08]" textClass="text-[#F0E8D5]" borderClass="border-[#2A2015]" />
                <ColorSwatch name="Surface (Tobacco)" hex="#141009" bgClass="bg-[#141009]" textClass="text-[#F0E8D5]" borderClass="border-[#2A2015]" />
                <ColorSwatch name="Elevated Surface" hex="#1C160D" bgClass="bg-[#1C160D]" textClass="text-[#F0E8D5]" borderClass="border-[#2A2015]" />
              </div>
            </div>
            
            {/* Action / Data */}
            <div className="flex flex-col gap-4">
              <h4 className="brand-kit-text-primary font-medium">Signal & Action</h4>
              <div className="flex flex-col gap-2">
                <ColorSwatch name="Signal Orange (Logo)" hex="#FF5E00" bgClass="bg-[#FF5E00]" textClass="text-[#0D0B08]" />
                <ColorSwatch name="Signal Amber" hex="#FFB12B" bgClass="bg-[#FFB12B]" textClass="text-[#0D0B08]" />
                <ColorSwatch name="Amber Press" hex="#E0920C" bgClass="bg-[#E0920C]" textClass="text-[#0D0B08]" />
                <ColorSwatch name="Amber Glow" hex="#FFCB6B" bgClass="bg-[#FFCB6B]" textClass="text-[#0D0B08]" />
              </div>
            </div>

            {/* Text & Neutrals */}
            <div className="flex flex-col gap-4">
              <h4 className="brand-kit-text-primary font-medium">Text & Neutrals</h4>
              <div className="flex flex-col gap-2">
                <ColorSwatch name="Cream (Primary)" hex="#F0E8D5" bgClass="bg-[#F0E8D5]" textClass="text-[#0D0B08]" />
                <ColorSwatch name="Faded Ink (Secondary)" hex="#A8997B" bgClass="bg-[#A8997B]" textClass="text-[#0D0B08]" />
                <ColorSwatch name="Muted (Quiet)" hex="#7A6A50" bgClass="bg-[#7A6A50]" textClass="text-[#F0E8D5]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="p-6 border border-[#2A2015] bg-[#141009] rounded">
              <div className="text-[#FFB12B] font-['Space_Grotesk'] mb-2 font-medium">DO</div>
              <p className="brand-kit-text-secondary text-sm">Use Signal Amber sparingly for the most important action on a screen or to highlight critical shifts in data. Backgrounds stay warm dark.</p>
            </div>
            <div className="p-6 border border-[#2A2015] bg-[#141009] rounded">
              <div className="text-[#7A6A50] font-['Space_Grotesk'] mb-2 font-medium">DON'T</div>
              <p className="brand-kit-text-secondary text-sm">Never use amber for large fills, background colors, or generic decorative elements. This dilutes its power as a navigational signal.</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-['Space_Grotesk'] text-xl brand-kit-text-primary uppercase tracking-widest text-sm border-b border-[#3A2D1C] pb-4">
              02 // Typography Hierarchy
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4 border border-[#2A2015] p-6 rounded bg-[#141009]">
              <div className="font-['Space_Grotesk'] text-4xl brand-kit-text-primary mb-2">Space Grotesk</div>
              <div className="brand-kit-text-secondary text-sm mb-4">Display / Headings</div>
              <p className="brand-kit-text-muted text-sm leading-relaxed">
                Used for primary navigation, section headers, and major typographic moments. Brings a technical, engineered feel while remaining highly legible.
              </p>
            </div>
            <div className="flex flex-col gap-4 border border-[#2A2015] p-6 rounded bg-[#141009]">
              <div className="font-['Inter'] text-2xl font-medium brand-kit-text-primary mb-2 mt-2">Inter</div>
              <div className="brand-kit-text-secondary text-sm mb-4">Body / UI</div>
              <p className="brand-kit-text-muted text-sm leading-relaxed">
                The workhorse. Used for all long-form reading, secondary UI elements, dense tables, and descriptive text. Quietly confident.
              </p>
            </div>
            <div className="flex flex-col gap-4 border border-[#2A2015] p-6 rounded bg-[#141009]">
              <div className="font-['JetBrains_Mono'] text-xl brand-kit-text-primary mb-2 mt-3">JetBrains Mono</div>
              <div className="brand-kit-text-secondary text-sm mb-4">Numerics / Data / Code</div>
              <p className="brand-kit-text-muted text-sm leading-relaxed">
                Reserved strictly for quantitative data, metric outputs, coordinates, and technical identifiers.
              </p>
            </div>
          </div>
        </section>

        {/* Voice & Tone */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-['Space_Grotesk'] text-xl brand-kit-text-primary uppercase tracking-widest text-sm border-b border-[#3A2D1C] pb-4">
              03 // Voice & Tone
            </h3>
            <p className="brand-kit-text-secondary max-w-2xl mt-4">
              Tone is navigational and considered. Instrument-grade clarity over marketing hype. We speak with quiet confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="brand-kit-text-primary font-medium">Sample Phrases</h4>
              <ul className="flex flex-col gap-3 font-['Space_Grotesk'] text-lg brand-kit-text-secondary">
                <li className="flex gap-4 items-center">
                  <span className="text-[#FFB12B] font-['JetBrains_Mono'] text-sm">→</span>
                  "Chart the network."
                </li>
                <li className="flex gap-4 items-center">
                  <span className="text-[#FFB12B] font-['JetBrains_Mono'] text-sm">→</span>
                  "Mark your coordinates."
                </li>
                <li className="flex gap-4 items-center">
                  <span className="text-[#FFB12B] font-['JetBrains_Mono'] text-sm">→</span>
                  "Find true north in unmapped markets."
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="brand-kit-text-primary font-medium">Copy Examples</h4>
              <div className="flex flex-col gap-3">
                <div className="p-4 border border-[#2A2015] bg-[#141009] rounded flex gap-4">
                  <div className="text-[#FFB12B] font-['JetBrains_Mono'] text-sm mt-1">DO</div>
                  <div className="brand-kit-text-primary">"The model lost its bearing."</div>
                </div>
                <div className="p-4 border border-[#2A2015] bg-[#141009] rounded flex gap-4">
                  <div className="text-[#7A6A50] font-['JetBrains_Mono'] text-sm mt-1">DON'T</div>
                  <div className="brand-kit-text-muted">"Unleash the power of next-gen AI to supercharge your ROI!"</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logo Usage */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-['Space_Grotesk'] text-xl brand-kit-text-primary uppercase tracking-widest text-sm border-b border-[#3A2D1C] pb-4">
              04 // Identity System
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 border border-[#2A2015] bg-[#141009] p-12 rounded flex flex-col items-center justify-center gap-6 relative overflow-hidden grid-pattern">
              <div className="absolute inset-0 opacity-20 pointer-events-none"></div>
              <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FF5E00" strokeWidth="7" fill="none" />
                <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FF5E00" />
              </svg>
              <div className="font-['Space_Grotesk'] text-2xl tracking-widest brand-kit-text-primary uppercase relative z-10">
                False Dawn
              </div>
              <div className="absolute top-4 left-4 text-xs font-['JetBrains_Mono'] text-[#7A6A50]">Clear Space: 2x logo height</div>
            </div>
            
            <div className="border border-[#2A2015] bg-[#141009] p-6 rounded flex flex-col items-center justify-center relative opacity-70">
              <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FFB12B" strokeWidth="7" fill="none" />
                <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FFB12B" />
              </svg>
              <div className="absolute top-2 right-2 text-[#A8997B] font-bold">X</div>
              <div className="mt-4 text-xs text-[#7A6A50] uppercase tracking-wider text-center">Don't recolor</div>
            </div>

            <div className="border border-[#2A2015] bg-[#141009] p-6 rounded flex flex-col items-center justify-center relative opacity-70">
              <svg width="96" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="relative z-10">
                <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FF5E00" strokeWidth="7" fill="none" />
                <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FF5E00" />
              </svg>
              <div className="absolute top-2 right-2 text-[#A8997B] font-bold">X</div>
              <div className="mt-4 text-xs text-[#7A6A50] uppercase tracking-wider text-center">Don't stretch</div>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-['Space_Grotesk'] text-xl brand-kit-text-primary uppercase tracking-widest text-sm border-b border-[#3A2D1C] pb-4 flex justify-between items-baseline">
              <span>05 // Accessibility Standards</span>
              <span className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">Base: #0D0B08</span>
            </h3>
          </div>

          <div className="border border-[#2A2015] rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#141009] border-b border-[#2A2015] font-['Space_Grotesk'] uppercase tracking-wider text-[#A8997B]">
                <tr>
                  <th className="p-4 font-normal">Color Token</th>
                  <th className="p-4 font-normal">Contrast Ratio</th>
                  <th className="p-4 font-normal">WCAG Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2015] bg-[#0D0B08]">
                <TableRow name="Cream #F0E8D5" ratio="16.11:1" rating="AAA" colorHex="#F0E8D5" />
                <TableRow name="Faded Ink #A8997B" ratio="7.03:1" rating="AAA" colorHex="#A8997B" />
                <TableRow name="Muted #7A6A50" ratio="3.75:1" rating="Large text only" colorHex="#7A6A50" />
                <TableRow name="Signal Orange #FF5E00" ratio="6.3:1" rating="AA normal text" colorHex="#FF5E00" />
                <TableRow name="Signal Amber #FFB12B" ratio="10.83:1" rating="AAA" colorHex="#FFB12B" />
                <TableRow name="Amber Glow #FFCB6B" ratio="13.11:1" rating="AAA" colorHex="#FFCB6B" />
                <TableRow name="Amber Press #E0920C" ratio="7.94:1" rating="AAA" colorHex="#E0920C" />
                <tr>
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#FFB12B] border border-[#2A2015]"></div>
                    <span className="brand-kit-text-primary font-medium">Parchment Night on Signal Amber</span>
                  </td>
                  <td className="p-4 font-['JetBrains_Mono'] text-[#F0E8D5]">10.83:1</td>
                  <td className="p-4 text-[#FFCB6B] font-['JetBrains_Mono'] uppercase">AAA</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-6 border border-[#2A2015] bg-[#141009] rounded flex gap-4 items-start">
            <div className="text-[#FFB12B] mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h4 className="brand-kit-text-primary font-medium mb-1">Colorblind Safety Note</h4>
              <p className="brand-kit-text-secondary text-sm leading-relaxed">
                Data series within the warm family (e.g. stable baseline vs. volatile spike) must be distinguished by label, weight, or position — never by hue alone. Amber-for-text should always use the brighter token (Signal Amber or Amber Glow) to maintain legibility.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, bgClass, textClass, borderClass = "" }: { name: string, hex: string, bgClass: string, textClass: string, borderClass?: string }) {
  return (
    <div className={`p-4 rounded flex items-center justify-between ${bgClass} ${borderClass ? `border ${borderClass}` : ''}`}>
      <span className={`${textClass} font-medium`}>{name}</span>
      <span className={`${textClass} font-['JetBrains_Mono'] text-sm opacity-80`}>{hex}</span>
    </div>
  );
}

function TableRow({ name, ratio, rating, colorHex }: { name: string, ratio: string, rating: string, colorHex: string }) {
  return (
    <tr>
      <td className="p-4 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border border-[#2A2015]" style={{ backgroundColor: colorHex }}></div>
        <span className="brand-kit-text-primary font-medium">{name}</span>
      </td>
      <td className="p-4 font-['JetBrains_Mono'] text-[#F0E8D5]">{ratio}</td>
      <td className={`p-4 font-['JetBrains_Mono'] uppercase ${rating.includes('AAA') ? 'text-[#FFCB6B]' : rating.includes('AA ') ? 'text-[#FFB12B]' : 'text-[#A8997B]'}`}>
        {rating}
      </td>
    </tr>
  );
}
