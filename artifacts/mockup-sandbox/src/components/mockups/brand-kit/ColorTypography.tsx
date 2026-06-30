import React from "react";

export function ColorTypography() {
  return (
    <div
      className="min-h-screen w-full selection:bg-[#FFB12B] selection:text-[#0D0B08] p-8 md:p-16 lg:p-24"
      style={{ backgroundColor: "#0D0B08", color: "#F0E8D5" }}
    >
      <div className="mx-auto max-w-6xl space-y-32">
        {/* Header */}
        <header className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-[#3A2D1C]" />
            <span className="font-['JetBrains_Mono'] text-xs tracking-widest text-[#7A6A50] uppercase">
              Brand System — Document 01
            </span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-5xl md:text-7xl font-medium tracking-tight text-[#F0E8D5]">
            False Dawn Industries
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <h2 className="font-['Space_Grotesk'] text-2xl text-[#A8997B]">
              Cartographic Precision
            </h2>
            <div className="hidden sm:block h-1 w-1 rounded-full bg-[#3A2D1C]" />
            <p className="font-['Inter'] text-lg text-[#7A6A50] max-w-xl leading-relaxed">
              Find true north in unmapped markets. A precision navigational
              instrument where quantitative thinking meets creative strategy.
            </p>
          </div>
        </header>

        {/* Colors */}
        <section className="space-y-16">
          <div className="flex items-center gap-4 border-b border-[#2A2015] pb-4">
            <span className="font-['JetBrains_Mono'] text-sm text-[#FFB12B]">
              01
            </span>
            <h3 className="font-['Space_Grotesk'] text-2xl text-[#F0E8D5]">
              Color System
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Backgrounds */}
            <div className="space-y-6">
              <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
                Backgrounds
              </h4>
              <div className="space-y-4">
                <Swatch
                  name="Base"
                  role="Parchment Night"
                  hex="#0D0B08"
                  textColor="#F0E8D5"
                  hasBorder
                />
                <Swatch
                  name="Surface"
                  role="Tobacco"
                  hex="#141009"
                  textColor="#F0E8D5"
                  hasBorder
                />
                <Swatch
                  name="Elevated"
                  role="Surface"
                  hex="#1C160D"
                  textColor="#F0E8D5"
                  hasBorder
                />
              </div>
            </div>

            {/* Borders */}
            <div className="space-y-6">
              <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
                Borders
              </h4>
              <div className="space-y-4">
                <Swatch
                  name="Umber"
                  role="Default border"
                  hex="#2A2015"
                  textColor="#F0E8D5"
                />
                <Swatch
                  name="Hairline"
                  role="Subtle divider"
                  hex="#3A2D1C"
                  textColor="#F0E8D5"
                />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-6">
              <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
                Text
              </h4>
              <div className="space-y-4">
                <Swatch
                  name="Primary"
                  role="Cream"
                  hex="#F0E8D5"
                  textColor="#0D0B08"
                />
                <Swatch
                  name="Secondary"
                  role="Faded Ink"
                  hex="#A8997B"
                  textColor="#0D0B08"
                />
                <Swatch
                  name="Muted"
                  role="Quiet text"
                  hex="#7A6A50"
                  textColor="#F0E8D5"
                />
              </div>
            </div>

            {/* Semantic */}
            <div className="space-y-6">
              <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
                Semantic & Accent
              </h4>
              <div className="space-y-4">
                <Swatch
                  name="Signal Orange"
                  role="Logo mark only"
                  hex="#FF5E00"
                  textColor="#0D0B08"
                />
                <Swatch
                  name="Signal Amber"
                  role="Hero accent"
                  hex="#FFB12B"
                  textColor="#0D0B08"
                />
                <Swatch
                  name="Meridian"
                  role="Stable metric"
                  hex="#5ABFA8"
                  textColor="#0D0B08"
                />
                <Swatch
                  name="Distress"
                  role="Volatile metric"
                  hex="#D8504A"
                  textColor="#F0E8D5"
                />
              </div>
            </div>
          </div>

          {/* Tonal Ramp */}
          <div className="pt-8 space-y-6">
            <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
              Signal Amber Ramp
            </h4>
            <div className="flex h-32 rounded-lg overflow-hidden border border-[#2A2015]">
              <div
                className="flex-1 flex flex-col justify-end p-4"
                style={{ backgroundColor: "#E0920C" }}
              >
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08]">
                  Press
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08] opacity-70">
                  #E0920C
                </span>
              </div>
              <div
                className="flex-[1.5] flex flex-col justify-end p-4"
                style={{ backgroundColor: "#FFB12B" }}
              >
                <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#0D0B08]">
                  Signal
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08] opacity-70">
                  #FFB12B
                </span>
              </div>
              <div
                className="flex-1 flex flex-col justify-end p-4"
                style={{ backgroundColor: "#FFCB6B" }}
              >
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08]">
                  Glow
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08] opacity-70">
                  #FFCB6B
                </span>
              </div>
              <div
                className="flex-1 flex flex-col justify-end p-4"
                style={{ backgroundColor: "#FFE5AD" }}
              >
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08]">
                  Tint 1
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08] opacity-70">
                  #FFE5AD
                </span>
              </div>
              <div
                className="flex-1 flex flex-col justify-end p-4"
                style={{ backgroundColor: "#FFF8E7" }}
              >
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08]">
                  Tint 2
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#0D0B08] opacity-70">
                  #FFF8E7
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-16">
          <div className="flex items-center gap-4 border-b border-[#2A2015] pb-4">
            <span className="font-['JetBrains_Mono'] text-sm text-[#FFB12B]">
              02
            </span>
            <h3 className="font-['Space_Grotesk'] text-2xl text-[#F0E8D5]">
              Typography
            </h3>
          </div>

          <div className="space-y-24">
            {/* Space Grotesk */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <h4 className="font-['Space_Grotesk'] text-xl text-[#F0E8D5]">
                  Space Grotesk
                </h4>
                <p className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                  Display / Headings
                </p>
                <p className="font-['Inter'] text-sm text-[#A8997B] pt-4">
                  Weights: Medium (500), Bold (700)
                </p>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <div className="font-['Space_Grotesk'] text-5xl md:text-7xl leading-tight text-[#F0E8D5]">
                  Chart the network. Mark your coordinates.
                </div>
              </div>
            </div>

            {/* Inter */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <h4 className="font-['Inter'] font-semibold text-xl text-[#F0E8D5]">
                  Inter
                </h4>
                <p className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                  Body / UI
                </p>
                <p className="font-['Inter'] text-sm text-[#A8997B] pt-4">
                  Weights: Regular (400), Medium (500)
                </p>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <div className="font-['Inter'] text-2xl md:text-3xl leading-snug text-[#F0E8D5]">
                  The model lost its bearing. We must recalibrate the instrument
                  to find true north in unmapped markets.
                </div>
                <div className="font-['Inter'] text-base md:text-lg text-[#A8997B] leading-relaxed max-w-3xl">
                  By mapping the unseen dynamics of market behavior, we surface
                  signals that others miss. Our instruments are calibrated for
                  environments where human volatility meets algorithmic rigidity.
                  Observe, orient, decide, act.
                </div>
              </div>
            </div>

            {/* JetBrains Mono */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <h4 className="font-['JetBrains_Mono'] text-xl text-[#F0E8D5]">
                  JetBrains Mono
                </h4>
                <p className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                  Numerics / Data / Code
                </p>
                <p className="font-['Inter'] text-sm text-[#A8997B] pt-4">
                  Weights: Regular (400), Bold (700)
                </p>
              </div>
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#141009] border border-[#2A2015] p-6 rounded-lg">
                  <div className="space-y-2">
                    <div className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                      REVENUE_YTD
                    </div>
                    <div className="font-['JetBrains_Mono'] text-2xl text-[#F0E8D5]">
                      $1,284,500
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                      ACTIVE_USERS
                    </div>
                    <div className="font-['JetBrains_Mono'] text-2xl text-[#F0E8D5]">
                      DAU 50,000
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                      ACQUISITION
                    </div>
                    <div className="font-['JetBrains_Mono'] text-2xl text-[#5ABFA8]">
                      CAC $2.50
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-['JetBrains_Mono'] text-xs text-[#7A6A50]">
                      VARIANCE
                    </div>
                    <div className="font-['JetBrains_Mono'] text-2xl text-[#D8504A]">
                      +18.4%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Type Scale */}
            <div className="pt-16 border-t border-[#2A2015] space-y-12">
              <h4 className="font-['JetBrains_Mono'] text-xs text-[#7A6A50] uppercase tracking-wider">
                Type Scale
              </h4>
              <div className="space-y-8">
                <TypeRow
                  label="Display"
                  font="Space Grotesk"
                  size="72px"
                  sample="Dynamics"
                  className="font-['Space_Grotesk'] text-[72px] leading-none"
                />
                <TypeRow
                  label="H1"
                  font="Space Grotesk"
                  size="48px"
                  sample="System Engine"
                  className="font-['Space_Grotesk'] text-[48px] leading-none"
                />
                <TypeRow
                  label="H2"
                  font="Space Grotesk"
                  size="32px"
                  sample="Cartographic Precision"
                  className="font-['Space_Grotesk'] text-[32px] leading-none"
                />
                <TypeRow
                  label="Body"
                  font="Inter"
                  size="16px"
                  sample="A precision navigational instrument."
                  className="font-['Inter'] text-[16px] leading-normal"
                />
                <TypeRow
                  label="Caption"
                  font="JetBrains Mono"
                  size="12px"
                  sample="LAT 37.7749 N / LNG 122.4194 W"
                  className="font-['JetBrains_Mono'] text-[12px] uppercase tracking-wider"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Swatch({
  name,
  role,
  hex,
  textColor,
  hasBorder = false,
}: {
  name: string;
  role: string;
  hex: string;
  textColor: string;
  hasBorder?: boolean;
}) {
  return (
    <div
      className={`group flex items-center justify-between p-4 rounded-lg transition-colors ${
        hasBorder ? "border border-[#2A2015]" : ""
      }`}
      style={{ backgroundColor: hex }}
    >
      <div className="space-y-1">
        <div className="font-['Inter'] font-medium" style={{ color: textColor }}>
          {name}
        </div>
        <div
          className="font-['Inter'] text-sm opacity-70"
          style={{ color: textColor }}
        >
          {role}
        </div>
      </div>
      <div
        className="font-['JetBrains_Mono'] text-sm tracking-wider opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ color: textColor }}
      >
        {hex}
      </div>
    </div>
  );
}

function TypeRow({
  label,
  font,
  size,
  sample,
  className,
}: {
  label: string;
  font: string;
  size: string;
  sample: string;
  className: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#2A2015] pb-6 gap-4">
      <div className="flex flex-col gap-1 w-48 shrink-0">
        <span className="font-['JetBrains_Mono'] text-[#F0E8D5] text-sm">
          {label}
        </span>
        <span className="font-['Inter'] text-[#A8997B] text-sm">{font}</span>
        <span className="font-['JetBrains_Mono'] text-[#7A6A50] text-xs">
          {size}
        </span>
      </div>
      <div className={`text-[#F0E8D5] truncate w-full ${className}`}>
        {sample}
      </div>
    </div>
  );
}
