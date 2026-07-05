import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import theseus_growth as th

# --- UX / UI CONFIGURATION ---
st.set_page_config(page_title="False Dawn Industries — System Dynamics Engine", layout="wide", initial_sidebar_state="expanded")

# --- FALSE DAWN INDUSTRIES BRAND SYSTEM ---
# Strict two-tone warm family. Signal Orange (#FF5E00) = logo mark ONLY.
# Accents use the amber ramp; neutrals are cream/faded on near-black. No teal, no red.
BRAND = {
    "base": "#0D0B08",
    "surface": "#141009",
    "elevated": "#1C160D",
    "border": "#2A2015",
    "hairline": "#3A2D1C",
    "cream": "#F0E8D5",
    "faded": "#A8997B",
    "muted": "#7A6A50",
    "amber": "#FFB12B",
    "amber_press": "#E0920C",
    "amber_glow": "#FFCB6B",
    "signal_orange": "#FF5E00",
}

# Custom CSS — warm two-tone FDI aesthetic on near-black
st.markdown(f"""
    <style>
    .stApp {{ background-color: {BRAND['base']}; color: {BRAND['cream']}; }}
    [data-testid="stHeader"] {{ background: transparent; }}
    [data-testid="stSidebar"] {{ background-color: {BRAND['surface']}; border-right: 1px solid {BRAND['border']}; }}
    h1, h2, h3, h4 {{ font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 500; letter-spacing: -.015em; color: {BRAND['cream']}; }}
    p, label, span, .stMarkdown {{ color: {BRAND['cream']}; }}
    .stTabs [data-baseweb="tab-list"] {{ gap: 24px; border-bottom: 1px solid {BRAND['border']}; }}
    .stTabs [data-baseweb="tab"] {{ height: 50px; white-space: pre-wrap; font-weight: 500; color: {BRAND['faded']}; }}
    .stTabs [aria-selected="true"] {{ color: {BRAND['amber']}; }}
    .stTabs [data-baseweb="tab-highlight"] {{ background-color: {BRAND['amber']}; }}
    /* Status / alert blocks unified to the warm family (no green/blue/red) */
    [data-testid="stAlert"], .stAlert,
    [data-testid="stAlertContainer"],
    [data-testid="stAlert"] [role="alert"] {{
        background-color: {BRAND['elevated']} !important;
        border-color: {BRAND['hairline']} !important;
        border-left: 3px solid {BRAND['amber']} !important;
        color: {BRAND['cream']} !important;
        border-radius: 4px;
    }}
    [data-testid="stAlert"] *, .stAlert * {{ color: {BRAND['cream']} !important; }}
    [data-testid="stAlert"] svg {{ fill: {BRAND['amber']} !important; color: {BRAND['amber']} !important; }}
    /* Metrics */
    [data-testid="stMetricValue"] {{ color: {BRAND['amber']}; font-family: 'Space Grotesk', sans-serif; }}
    [data-testid="stMetricLabel"] {{ color: {BRAND['faded']}; }}
    /* Inputs / widgets accent */
    .stSlider [data-baseweb="slider"] [role="slider"] {{ background-color: {BRAND['amber']}; }}
    /* FDI header lockup */
    .fdi-header {{ display: flex; align-items: center; gap: 16px; padding: 4px 0 2px; }}
    .fdi-header .mark {{ width: 40px; height: 40px; color: {BRAND['signal_orange']}; flex: none; }}
    .fdi-header .mark .arc {{ stroke: currentColor; stroke-width: 7; fill: none; }}
    .fdi-header .mark .fill {{ fill: currentColor; }}
    .fdi-header .wm {{ font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: .16em;
        text-transform: uppercase; color: {BRAND['cream']}; font-size: 1.05rem; line-height: 1; }}
    .fdi-eyebrow {{ font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: .28em;
        color: {BRAND['faded']}; font-size: .7rem; margin: 14px 0 2px; }}
    </style>
    """, unsafe_allow_html=True)

# --- FDI MASTER BRAND HEADER (logo mark in Signal Orange only) ---
st.markdown("""
    <div class="fdi-header">
        <svg class="mark" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path class="arc" d="M12 50 A38 38 0 0 1 88 50"/>
            <path class="fill" d="M12 50 A38 38 0 0 0 88 50 Z"/>
        </svg>
        <span class="wm">False Dawn Industries</span>
    </div>
    <div class="fdi-eyebrow">Growth Cartography</div>
    """, unsafe_allow_html=True)

# --- DYNAMIC PARADIGM LAYER ---
PARADIGMS = {
    "Aggregated Consumer/SaaS": {
        "unit": "Users",
        "metric": "DAU",
        "metric_full": "Daily Active Users",
        "cost": "CAC / CPI ($)",
        "yield": "LTV ($)",
        "yield_title": "Projected Extracted LTV",
        "drip": "Paid Media (Drip)",
        "spike": "Earned Media (PR Spike)"
    },
    "Decentralized Compute / Web3 Network": {
        "unit": "Nodes",
        "metric": "DAN",
        "metric_full": "Daily Active Nodes",
        "cost": "Token Emission Bounty",
        "yield": "Yield Spread",
        "yield_title": "Projected Protocol Revenue",
        "drip": "Algorithmic Token Drip",
        "spike": "Airdrop / Mercenary Capital"
    },
    "Autonomous AI Economy": {
        "unit": "Agents",
        "metric": "DAA",
        "metric_full": "Daily Active Agents",
        "cost": "CPO / Compute Subsidy",
        "yield": "Micro-transaction Volume",
        "yield_title": "Projected Agent Revenue",
        "drip": "Steady API Subsidies",
        "spike": "Viral Meme Agent Deployment"
    }
}

st.title("System Dynamics Engine")
st.caption("Network Vitality, Thermodynamic Equilibrium, and Value Extraction")

with st.expander("📖 The Philosophy: Network Vitality"):
    st.markdown("""
    Whether you are acquiring a human subscriber, a decentralized compute node, or an autonomous AI agent, **every network experiences decay.** 
    
    This engine calculates the exact thermodynamic energy (budget, token emissions, or computing subsidies) required to achieve system equilibrium. By simulating the compounding effect of cohort survival, cross-disciplinary teams can establish a **Baseline Benchmark** to evaluate volatile cultural interventions against stable network mechanics.
    
    [📚 Read the complete Guide in the README](https://github.com/jratlee/FDI/blob/main/README.md)
    - *Includes The "Lemonade Stand" ELI5 Explanation*
    - *Includes the full "Network Paradigm" Glossary*
    - *Explains what the Mathematical Decay Functions (`exp`, `log`, etc.) represent for human behavior*
    """)

# --- INITIALIZE THESEUS ---
@st.cache_resource
def init_theseus():
    return th.theseus()

engine = init_theseus()

# --- SIDEBAR: GLOBAL ASSUMPTIONS & PARADIGM ---
with st.sidebar:
    st.header("Network Paradigm")
    selected_paradigm = st.selectbox("Select Business Model", list(PARADIGMS.keys()))
    vocab = PARADIGMS[selected_paradigm]
    
    st.divider()
    
    st.header("Global Parameters")
    days_to_project = st.slider("Projection Timeline (Days)", 30, 180, 90)
    
    st.markdown("**Retention Profiles**")
    
    # Exposing the Volatile Curve Shape
    volatile_curve = st.selectbox(
        f"Volatile Profile Decay Function", 
        ['best_fit', 'exp', 'log', 'power', 'weibull'],
        help="Select 'exp' (Exponential Decay) to strictly model mercenary capital/immediate churn."
    )
    
    # Create retention profiles dynamically based on sidebar inputs
    stable_retention = engine.create_profile([1, 7, 30], [40, 20, 10], profile_max=days_to_project)
    volatile_retention = engine.create_profile([1, 7, 30], [25, 15, 8], form=volatile_curve, profile_max=days_to_project) 
    
    st.markdown(f"**{vocab['drip']} Baseline**")
    daily_paid = st.slider(f"Daily Steady {vocab['unit']}", 0, 5000, 1000)
    paid_cohorts = [daily_paid] * days_to_project
    
    st.success(f"System Loaded: Stable Baseline, Volatile Dynamics")


# --- UNIFIED TABS ---
tab1, tab2, tab3 = st.tabs([
    "1. Network Liquidity Target", 
    "2. Volatility vs. Stability Modeling", 
    "3. Cohort Maturity & Value Extraction"
])

with tab1:
    st.subheader("Network Liquidity Target")
    st.write(f"Calculate the baseline daily injection of new {vocab['unit'].lower()} required to hit a specific {vocab['metric']} equilibrium milestone.")
    
    col1, col2 = st.columns(2)
    with col1:
        target_dau = st.number_input(f"Target {vocab['metric']}", min_value=1000, value=50000, step=1000)
        
        # Engine constraint: target timeline must be <= periods - cohorts
        base_cohorts = [1000] * 5
        max_timeline = max(10, days_to_project - len(base_cohorts))
        
        target_timeline = st.number_input("Days to Reach Target", min_value=10, max_value=max_timeline, value=min(60, max_timeline))
        cpi = st.number_input(f"Estimated {vocab['cost']}", value=2.50)
    
    with col2:
        st.info("Dynamics Output")
        try:
            # Run Theseus targeted DAU projection
            target_proj = engine.project_cohorted_DAU(
                profile=stable_retention, periods=days_to_project, cohorts=base_cohorts,
                DAU_target=target_dau, DAU_target_timeline=target_timeline, start_date=1
            )
            dnu_needed = engine.get_DNU(target_proj)
            total_dnu = dnu_needed.iloc[0].sum()
            
            st.metric(f"Total New {vocab['unit']} Required", f"{int(total_dnu):,}")
            st.metric("Total Energy / Capital Required", f"${int(total_dnu * cpi):,}")
        except Exception as e:
            st.error(f"Projection Error: Adjust timeline or targets. ({e})")

with tab2:
    st.subheader("Volatility vs. Stability Modeling")
    st.write(f"Model the thermodynamic impact of a sustained stable injection versus a massive volatile spike (e.g. {vocab['spike'].lower()}).")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**Stable Baseline Active**")
        st.info(f"Using sidebar baseline: {daily_paid:,} daily base {vocab['unit'].lower()}")
        
    with col2:
        st.markdown(f"**{vocab['spike']}**")
        pr_spike_size = st.slider(f"Volatile Event Volume ({vocab['unit']})", 0, 100000, 25000)
        spike_day = st.slider("Day of Event", 1, days_to_project, 15)
        
        # Build PR cohorts (organic baseline + massive spike on day X)
        pr_cohorts = [50] * days_to_project
        pr_cohorts[spike_day-1] = pr_spike_size
        
    # Generate Projections
    stable_dau = engine.project_cohorted_DAU(stable_retention, days_to_project, paid_cohorts)
    volatile_dau = engine.project_cohorted_DAU(volatile_retention, days_to_project, pr_cohorts)
    
    combined = engine.combine_DAU(
        [engine.DAU_total(stable_dau), engine.DAU_total(volatile_dau)], 
        [f"Stable {vocab['metric']}", f"Volatile {vocab['metric']}"]
    )
    
    # Render Matplotlib chart
    # Warm two-tone convention: stable baseline = faded neutral (dashed),
    # volatile series = Signal Amber (solid). No teal/red.
    st.write(f"### Cumulative {vocab['metric']} System Dynamics")
    df_chart = combined.T # Transpose for plotting mapping index to days
    fig, ax = plt.subplots(figsize=(10, 4.5))
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)
    x = range(len(df_chart))  # 0-based day axis, robust to the index dtype
    # Distinguish stable vs volatile by warmth + a non-color cue (dash) rather than hue alone
    for col in df_chart.columns:
        if str(col).startswith("Stable"):
            ax.plot(x, df_chart[col], color=BRAND['faded'], linestyle='--', linewidth=1.8, label=str(col))
            ax.fill_between(x, df_chart[col], color=BRAND['faded'], alpha=0.12)
        else:
            ax.plot(x, df_chart[col], color=BRAND['amber'], linewidth=2.0, label=str(col))
            ax.fill_between(x, df_chart[col], color=BRAND['amber'], alpha=0.22)
    ax.set_xlabel("Day", color=BRAND['cream'])
    ax.set_ylabel(vocab['metric'], color=BRAND['cream'])
    ax.tick_params(colors=BRAND['cream'])
    for spine in ax.spines.values():
        spine.set_color(BRAND['border'])
    ax.grid(True, color=BRAND['border'], linewidth=0.6)
    ax.margins(x=0)
    legend = ax.legend(loc='upper left', frameon=False)
    for text in legend.get_texts():
        text.set_color(BRAND['cream'])
    fig.tight_layout()
    st.pyplot(fig)
    plt.close(fig)

with tab3:
    st.subheader("Cohort Maturity & Value Extraction")
    st.write(f"How much of your active {vocab['unit'].lower()} base has survived long enough to trigger extraction metrics? (e.g., passing a 14-day network threshold).")
    
    conversion_day = st.number_input(f"Maturity Milestone ({vocab['unit']} Age in Days)", min_value=1, max_value=days_to_project, value=14)
    conv_rate = st.slider(f"Expected Conversion / Yield Rate (%)", 0.0, 10.0, 2.5) / 100
    ltv = st.number_input(f"Expected {vocab['yield']}", value=49.99)
    
    # Calculate Aged DAU: users who are *at least* conversion_day old on any given day
    aged_dau = engine.project_aged_DAU(stable_retention, days_to_project, paid_cohorts, ages=[conversion_day])
    
    st.write(f"### Matured {vocab['unit']} Older Than {conversion_day} Days")
    st.line_chart(aged_dau.T, color=BRAND['amber'])
    
    # Calculate true unique users surviving past the milestone for revenue projection
    retention_rate = stable_retention['retention_projection'][1][conversion_day] / 100
    
    eligible_cohorts = paid_cohorts[:-conversion_day] if len(paid_cohorts) > conversion_day else [0]
    total_eligible_unique = sum(eligible_cohorts) * retention_rate
    
    projected_revenue = total_eligible_unique * conv_rate * ltv
    
    st.success(f"**{vocab['yield_title']}:** ${int(projected_revenue):,}")

# --- ATTRIBUTION / COPYRIGHT ---
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #A8997B; font-size: 0.8em;">
    &copy; 2026 False Dawn Industries. The System Dynamics Engine interface and paradigm implementation is a creation of False Dawn Industries.<br>
    Powered by the open-source MIT-licensed <a href="https://github.com/ESeufert/theseus_growth" target="_blank" style="color: #E0920C; text-decoration: underline;">theseus_growth</a> mathematical library originally created by Eric Benjamin Seufert at Heracles.
</div>
""", unsafe_allow_html=True)
