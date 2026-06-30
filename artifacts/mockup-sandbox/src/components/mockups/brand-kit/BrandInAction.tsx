import React from 'react';

export function BrandInAction() {
  return (
    <div className="w-full min-h-screen bg-[#0D0B08] text-[#F0E8D5] font-['Inter'] flex justify-center py-12 px-4 selection:bg-[#FFB12B] selection:text-[#0D0B08]">
      {/* App Wrapper */}
      <div className="max-w-[1280px] w-full border border-[#2A2015] bg-[#0D0B08] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="border-b border-[#2A2015] bg-[#141009] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 border border-[#3A2D1C] bg-[#1C160D]">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FF5E00" strokeWidth="8" fill="none" />
                <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FF5E00" />
              </svg>
            </div>
            <div>
              <h1 className="font-['Space_Grotesk'] text-xl font-medium tracking-tight text-[#F0E8D5]">
                System Dynamics Engine
              </h1>
              <p className="text-xs text-[#A8997B] tracking-wide uppercase mt-0.5 font-['Inter']">
                Network Vitality, Thermodynamic Equilibrium, and Value Extraction
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-['JetBrains_Mono'] text-[#A8997B]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5ABFA8]"></span>
              SYS.ONLINE
            </span>
            <span className="text-[#3A2D1C]">|</span>
            <span>v2.1.0-rc</span>
          </div>
        </header>

        {/* Body Layout */}
        <div className="flex flex-1 min-h-[800px]">
          
          {/* Left Sidebar */}
          <aside className="w-80 border-r border-[#2A2015] bg-[#141009] flex flex-col">
            <div className="p-6 border-b border-[#2A2015]">
              <h2 className="font-['Space_Grotesk'] text-sm tracking-wide text-[#7A6A50] uppercase mb-4">Network Paradigm</h2>
              <div className="relative">
                <select className="w-full appearance-none bg-[#1C160D] border border-[#3A2D1C] text-[#F0E8D5] text-sm py-2.5 pl-3 pr-8 focus:outline-none focus:border-[#A8997B] font-['Inter']">
                  <option>Aggregated Consumer/SaaS</option>
                  <option selected>Decentralized Compute / Web3 Network</option>
                  <option>Autonomous AI Economy</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#A8997B]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-8">
              <h2 className="font-['Space_Grotesk'] text-sm tracking-wide text-[#7A6A50] uppercase">Global Parameters</h2>
              
              {/* Slider 1 */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <label className="text-sm text-[#A8997B]">Projection Timeline</label>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#F0E8D5]">90 Days</span>
                </div>
                <div className="h-1 bg-[#2A2015] relative">
                  <div className="absolute top-0 left-0 h-full w-[50%] bg-[#A8997B]"></div>
                  <div className="absolute top-1/2 left-[50%] -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#F0E8D5] border border-[#141009]"></div>
                </div>
              </div>

              {/* Select */}
              <div className="flex flex-col gap-3">
                <label className="text-sm text-[#A8997B]">Volatile Profile Decay Function</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-[#1C160D] border border-[#3A2D1C] text-[#F0E8D5] text-sm py-2 pl-3 pr-8 focus:outline-none focus:border-[#A8997B]">
                    <option>best_fit</option>
                    <option selected>exp (Exponential Decay)</option>
                    <option>log</option>
                    <option>power</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#A8997B]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Slider 2 */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <label className="text-sm text-[#A8997B]">Daily Steady Users</label>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#F0E8D5]">1,000</span>
                </div>
                <div className="h-1 bg-[#2A2015] relative">
                  <div className="absolute top-0 left-0 h-full w-[20%] bg-[#A8997B]"></div>
                  <div className="absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#F0E8D5] border border-[#141009]"></div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-[#2A2015] bg-[#1C160D]">
              <div className="inline-flex items-center gap-2 border border-[#3A2D1C] bg-[#141009] px-3 py-1.5 w-full justify-center">
                <span className="w-2 h-2 bg-[#5ABFA8] shadow-[0_0_8px_rgba(90,191,168,0.6)]"></span>
                <span className="text-xs tracking-wider uppercase text-[#5ABFA8] font-['Space_Grotesk']">System Loaded</span>
              </div>
            </div>
          </aside>

          {/* Main Content area */}
          <main className="flex-1 flex flex-col bg-[#0D0B08]">
            
            {/* Tabs Header */}
            <div className="flex border-b border-[#2A2015] bg-[#141009]">
              <div className="px-6 py-4 text-[#7A6A50] text-sm border-r border-[#2A2015] font-['Inter'] cursor-not-allowed hover:text-[#A8997B] transition-colors">
                1. Network Liquidity Target
              </div>
              <div className="px-6 py-4 text-[#FFB12B] text-sm border-r border-[#2A2015] border-b-2 border-b-[#FFB12B] font-['Inter'] bg-[#1C160D] relative">
                2. Volatility vs. Stability Modeling
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FFB12B]"></div>
              </div>
              <div className="px-6 py-4 text-[#7A6A50] text-sm border-r border-[#2A2015] font-['Inter'] cursor-not-allowed hover:text-[#A8997B] transition-colors">
                3. Cohort Maturity &amp; Value Extraction
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-8 flex flex-col gap-8 flex-1">
              
              <div className="max-w-3xl">
                <h2 className="font-['Space_Grotesk'] text-2xl text-[#F0E8D5] mb-2">Volatility vs. Stability Modeling</h2>
                <p className="text-[#A8997B] text-sm leading-relaxed">
                  Model the thermodynamic impact of a sustained stable injection versus a massive volatile spike. Chart the network&apos;s resilience and mark your coordinates as human and machine dynamics collide.
                </p>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#141009] border border-[#2A2015] p-6 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#2A2015] to-transparent opacity-50"></div>
                  <div className="text-xs text-[#7A6A50] uppercase tracking-wider font-['Space_Grotesk']">Total New Users Required</div>
                  <div className="font-['JetBrains_Mono'] text-4xl text-[#F0E8D5] group-hover:text-[#FFCB6B] transition-colors">
                    412,000
                  </div>
                  <div className="text-[#A8997B] text-xs flex items-center gap-2">
                    <span className="text-[#5ABFA8]">↑ Steady Baseline</span>
                    <span>Computed across 90-day projection</span>
                  </div>
                </div>

                <div className="bg-[#1C160D] border border-[#3A2D1C] p-6 flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FFB12B]"></div>
                  <div className="text-xs text-[#A8997B] uppercase tracking-wider font-['Space_Grotesk']">Total Energy / Capital Required</div>
                  <div className="font-['JetBrains_Mono'] text-4xl text-[#FFB12B]">
                    $1,030,000
                  </div>
                  <div className="text-[#7A6A50] text-xs flex items-center gap-2">
                    <span className="text-[#FFB12B]">Critical Metric</span>
                    <span>Based on $2.50 CAC / CPI</span>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="border border-[#2A2015] bg-[#141009] flex flex-col flex-1 min-h-[400px]">
                <div className="px-6 py-4 border-b border-[#2A2015] flex justify-between items-center bg-[#1C160D]">
                  <h3 className="font-['Space_Grotesk'] text-sm tracking-wide text-[#F0E8D5] uppercase">Cumulative DAU System Dynamics</h3>
                  <div className="flex items-center gap-6 text-xs font-['JetBrains_Mono']">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-[#5ABFA8]"></span>
                      <span className="text-[#A8997B]">Stable Baseline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-[#D8504A]"></span>
                      <span className="text-[#A8997B]">Volatile Spike</span>
                    </div>
                  </div>
                </div>

                {/* Chart Body */}
                <div className="flex-1 p-6 relative flex flex-col">
                  {/* Y-Axis Labels */}
                  <div className="absolute left-6 top-6 bottom-12 w-12 flex flex-col justify-between text-[10px] text-[#7A6A50] font-['JetBrains_Mono'] z-10">
                    <span>100K</span>
                    <span>75K</span>
                    <span>50K</span>
                    <span>25K</span>
                    <span>0</span>
                  </div>

                  {/* SVG Chart */}
                  <div className="flex-1 ml-12 relative border-l border-b border-[#3A2D1C]">
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 400">
                      
                      {/* Gridlines (subtle amber-tinted) */}
                      <path d="M 0 0 L 1000 0" stroke="#FFB12B" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 4" />
                      <path d="M 0 100 L 1000 100" stroke="#FFB12B" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 4" />
                      <path d="M 0 200 L 1000 200" stroke="#FFB12B" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 4" />
                      <path d="M 0 300 L 1000 300" stroke="#FFB12B" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 4" />
                      
                      {/* Vertical gridlines */}
                      <path d="M 250 0 L 250 400" stroke="#3A2D1C" strokeWidth="1" strokeDasharray="2 4" />
                      <path d="M 500 0 L 500 400" stroke="#3A2D1C" strokeWidth="1" strokeDasharray="2 4" />
                      <path d="M 750 0 L 750 400" stroke="#3A2D1C" strokeWidth="1" strokeDasharray="2 4" />

                      {/* Stable Curve (#5ABFA8 - Meridian) */}
                      <path 
                        d="M 0 400 Q 150 250 300 180 T 600 120 T 1000 100" 
                        fill="none" 
                        stroke="#5ABFA8" 
                        strokeWidth="2" 
                      />
                      {/* Stable Curve Area Fill */}
                      <path 
                        d="M 0 400 Q 150 250 300 180 T 600 120 T 1000 100 L 1000 400 L 0 400 Z" 
                        fill="url(#stableGradient)" 
                        opacity="0.2"
                      />

                      {/* Volatile Spike (#D8504A - Distress) */}
                      <path 
                        d="M 0 400 L 200 380 L 250 360 L 300 50 L 350 150 L 450 280 L 600 350 L 800 380 L 1000 390" 
                        fill="none" 
                        stroke="#D8504A" 
                        strokeWidth="2" 
                      />
                      {/* Volatile Spike Area Fill */}
                      <path 
                        d="M 0 400 L 200 380 L 250 360 L 300 50 L 350 150 L 450 280 L 600 350 L 800 380 L 1000 390 L 1000 400 L 0 400 Z" 
                        fill="url(#volatileGradient)" 
                        opacity="0.15"
                      />

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="stableGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5ABFA8" stopOpacity="1"/>
                          <stop offset="100%" stopColor="#5ABFA8" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="volatileGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D8504A" stopOpacity="1"/>
                          <stop offset="100%" stopColor="#D8504A" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Intersect point / Marker */}
                      <circle cx="300" cy="50" r="4" fill="#D8504A" stroke="#0D0B08" strokeWidth="2" />
                      <line x1="300" y1="50" x2="300" y2="400" stroke="#D8504A" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                      <rect x="260" y="20" width="80" height="20" fill="#1C160D" stroke="#D8504A" strokeWidth="1" />
                      <text x="300" y="34" fill="#F0E8D5" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">SPIKE EVENT</text>
                    </svg>
                  </div>

                  {/* X-Axis Labels */}
                  <div className="ml-12 h-8 mt-2 flex justify-between text-[10px] text-[#7A6A50] font-['JetBrains_Mono']">
                    <span>Day 0</span>
                    <span>Day 22</span>
                    <span>Day 45</span>
                    <span>Day 67</span>
                    <span>Day 90</span>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
