import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import theseus_growth as th

# --- UX / UI CONFIGURATION (Google Labs / Pompeii Style) ---
st.set_page_config(page_title="False Dawn Industries", layout="wide", initial_sidebar_state="expanded")

# Custom CSS for a sleek, minimalist, dark/light aesthetic
st.markdown("""
    <style>
    .main {background-color: #0E1117;}
    h1, h2, h3 {font-family: 'Inter', sans-serif; font-weight: 300; letter-spacing: -1px;}
    .stTabs [data-baseweb="tab-list"] {gap: 24px;}
    .stTabs [data-baseweb="tab"] {height: 50px; white-space: pre-wrap; font-weight: 500;}
    </style>
    """, unsafe_allow_html=True)

st.title("◒ False Dawn Industries | Growth Engine")
st.caption("Advanced Cohort Forecasting, Media Mix Modeling, and Monetization Readiness")

# --- INITIALIZE THESEUS ---
@st.cache_resource
def init_theseus():
    return th.theseus()

engine = init_theseus()

# --- SIDEBAR: GLOBAL ASSUMPTIONS ---
with st.sidebar:
    st.header("Global Parameters")
    days_to_project = st.slider("Projection Timeline (Days)", 30, 180, 90)
    st.divider()
    st.markdown("**Retention Profiles**")
    # Mocking retention profiles for the UI
    paid_retention = engine.create_profile([1, 7, 30], [40, 20, 10], profile_max=days_to_project)
    earned_retention = engine.create_profile([1, 7, 30], [25, 15, 8], profile_max=days_to_project) # PR traffic often bounces faster
    st.success("Profiles Loaded: Paid Media, Earned Media (PR)")

# --- UNIFIED TABS ---
tab1, tab2, tab3 = st.tabs(["1. The Goal (Budget)", "2. The Mix (Earned vs Paid)", "3. The Yield (Monetization)"])

with tab1:
    st.subheader("Target Acquisition Simulator")
    st.write("Calculate the baseline Daily New Users (DNU) required to hit a specific milestone.")
    
    col1, col2 = st.columns(2)
    with col1:
        target_dau = st.number_input("Target DAU", min_value=1000, value=50000, step=1000)
        target_timeline = st.number_input("Days to Reach Target", min_value=10, value=60)
        cpi = st.number_input("Estimated Cost Per Install ($)", value=2.50)
    
    with col2:
        st.info("Engine Output")
        # Run Theseus targeted DAU projection
        base_cohorts = [1000] * 5 # Base organic
        target_proj = engine.project_cohorted_DAU(
            profile=paid_retention, periods=days_to_project, cohorts=base_cohorts,
            DAU_target=target_dau, DAU_target_timeline=target_timeline, start_date=1
        )
        dnu_needed = engine.get_DNU(target_proj)
        total_dnu = dnu_needed.iloc[0].sum()
        
        st.metric("Total New Users Required", f"{int(total_dnu):,}")
        st.metric("Estimated Acquisition Cost", f"${int(total_dnu * cpi):,}")

with tab2:
    st.subheader("Multi-Channel & Earned Media Simulator")
    st.write("Model the impact of a sustained paid drip versus a massive Earned Media / PR spike.")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Paid Media (Drip)**")
        daily_paid = st.slider("Daily Paid Installs", 0, 5000, 1000)
        paid_cohorts = [daily_paid] * days_to_project
        
    with col2:
        st.markdown("**Earned Media (The PR Spike)**")
        pr_spike_size = st.slider("PR Hit Volume (Users)", 0, 100000, 25000)
        spike_day = st.slider("Day of PR Hit", 1, days_to_project, 15)
        
        # Build PR cohorts (0 mostly, massive spike on day X)
        pr_cohorts = [50] * days_to_project
        pr_cohorts[spike_day-1] = pr_spike_size
        
    # Generate Projections
    paid_dau = engine.project_cohorted_DAU(paid_retention, days_to_project, paid_cohorts)
    pr_dau = engine.project_cohorted_DAU(earned_retention, days_to_project, pr_cohorts)
    
    combined = engine.combine_DAU([engine.DAU_total(paid_dau), engine.DAU_total(pr_dau)], ["Paid DAU", "Earned DAU"])
    
    # Render interactive Plotly chart
    st.write("### Cumulative DAU Forecast")
    df_chart = combined.T # Transpose for plotting
    fig = px.area(df_chart, labels={'value': 'DAU', 'index': 'Day'}, color_discrete_sequence=['#4A90E2', '#FF4B4B'])
    st.plotly_chart(fig, use_container_width=True)

with tab3:
    st.subheader("Monetization & Freemium Readiness")
    st.write("How much of your active user base has survived long enough to trigger monetization? (e.g., passing a 14-day free trial).")
    
    conversion_day = st.number_input("Monetization Milestone (User Age in Days)", min_value=1, value=14)
    conv_rate = st.slider("Expected Conversion to Paid (%)", 0.0, 10.0, 2.5) / 100
    ltv = st.number_input("Expected LTV ($)", value=49.99)
    
    # Calculate Aged DAU for the Paid Cohorts as an example
    aged_dau = engine.project_aged_DAU(paid_retention, days_to_project, paid_cohorts, ages=[conversion_day])
    
    st.write(f"### Users surviving past Day {conversion_day}")
    st.line_chart(aged_dau.T)
    
    total_eligible = aged_dau.iloc[0].sum()
    projected_revenue = total_eligible * conv_rate * ltv
    
    st.success(f"**Projected Revenue from Eligible Cohort:** ${int(projected_revenue):,}")
