import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import theseus_growth as th

# --- UX / UI CONFIGURATION ---
st.set_page_config(page_title="FDI | System Dynamics Engine", layout="wide", initial_sidebar_state="expanded")

# Custom CSS for a sleek, minimalist, dark/light aesthetic
st.markdown("""
    <style>
    .main {background-color: #0E1117;}
    h1, h2, h3 {font-family: 'Inter', sans-serif; font-weight: 300; letter-spacing: -1px;}
    .stTabs [data-baseweb="tab-list"] {gap: 24px;}
    .stTabs [data-baseweb="tab"] {height: 50px; white-space: pre-wrap; font-weight: 500;}
    </style>
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

st.title("◒ False Dawn Industries | System Dynamics Engine")
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
        st.markdown(f"**{vocab['drip']}**")
        daily_paid = st.slider(f"Daily Steady {vocab['unit']}", 0, 5000, 1000)
        paid_cohorts = [daily_paid] * days_to_project
        
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
    
    # Render interactive Plotly chart
    st.write(f"### Cumulative {vocab['metric']} System Dynamics")
    df_chart = combined.T # Transpose for plotting mapping index to days
    fig = px.area(df_chart, labels={'value': vocab['metric'], 'index': 'Day'}, color_discrete_sequence=['#4A90E2', '#FF4B4B'])
    st.plotly_chart(fig, width='stretch')

with tab3:
    st.subheader("Cohort Maturity & Value Extraction")
    st.write(f"How much of your active {vocab['unit'].lower()} base has survived long enough to trigger extraction metrics? (e.g., passing a 14-day network threshold).")
    
    conversion_day = st.number_input(f"Maturity Milestone ({vocab['unit']} Age in Days)", min_value=1, max_value=days_to_project, value=14)
    conv_rate = st.slider(f"Expected Conversion / Yield Rate (%)", 0.0, 10.0, 2.5) / 100
    ltv = st.number_input(f"Expected {vocab['yield']}", value=49.99)
    
    # Calculate Aged DAU: users who are *at least* conversion_day old on any given day
    aged_dau = engine.project_aged_DAU(stable_retention, days_to_project, paid_cohorts, ages=[conversion_day])
    
    st.write(f"### Matured {vocab['unit']} Older Than {conversion_day} Days")
    st.line_chart(aged_dau.T)
    
    # Calculate true unique users surviving past the milestone for revenue projection
    retention_rate = stable_retention['retention_projection'][1][conversion_day] / 100
    
    eligible_cohorts = paid_cohorts[:-conversion_day] if len(paid_cohorts) > conversion_day else [0]
    total_eligible_unique = sum(eligible_cohorts) * retention_rate
    
    projected_revenue = total_eligible_unique * conv_rate * ltv
    
    st.success(f"**{vocab['yield_title']}:** ${int(projected_revenue):,}")
