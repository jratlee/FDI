# ◒ False Dawn Industries | System Dynamics Engine

Imagine you have a lemonade stand, and you want to figure out how many people are going to come back tomorrow, next week, or next month.

This app helps us look into the future to guess things like:
- How much money we need to spend on ads to reach our daily goals?
- What happens if we get a huge shoutout on the news (a massive spike of people showing up)?
- How many people will stick around long enough to actually pay us money?

---

## The Reality: From Lemonade Stands to System Dynamics

To bridge the gap between today’s aggregated marketing environments (SaaS, Mobile Apps) and the decentralized, AI-driven business models of tomorrow, you need to understand the mechanics of growth.

The underlying math of this engine, **compounding cohort decay**, is universal. It governs human attention just as perfectly as it governs machine uptime or capital liquidity. This engine calculates the energy (marketing budget, token emissions, or compute subsidies) required to achieve system equilibrium.

## Quick Start

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/jratlee/FDI.git
   cd FDI
   pip install -r requirements.txt
   ```
2. Run the Streamlit app:
   ```bash
   streamlit run app.py
   ```

---

## The "Network Paradigm" Glossary

By using the **"Network Paradigm" Toggle** globally in the app, you change the business model vocabulary. Here is what a marketer or founder actually experiences in these three paradigms, and how to model them:

### 1. Aggregated Consumer/SaaS 
*   **The Vibe:** Human attention is flaky but habit-forming. Acquisition is highly competitive.
*   **What a Marketer Experiences:** You pay Meta or Google a **CAC** (Cost Per Acquisition) to acquire a human **DAU** (Daily Active User). If the onboarding experience is good, humans form habits and subscribe, yielding an **LTV** (Lifetime Value).
*   **How to Model It:** Focus heavily on *Tab 3 (Cohort Maturity)*. SaaS businesses only survive if users live long enough to hit the paywall.

### 2. Decentralized Compute / Web3 Network
*   **The Vibe:** Financialized networks where participants are financially motivated. 
*   **What a Marketer Experiences:** You issue **Token Bounties / Emissions** to acquire **DAN** (Daily Active Nodes). Users in this space often show up for the structural incentives (e.g. an airdrop) and instantly dump their tokens and leave, causing network volatility.
*   **How to Model It:** Focus heavily on *Tab 2 (Volatility vs Stability)*. You must model whether slow, algorithmic token drips are safer than massive volatile marketing stunts.

### 3. Autonomous AI Economy
*   **The Vibe:** Machine-to-machine economies where bots execute rapid transactions.
*   **What a Marketer Experiences:** You pay an **API Computing Subsidy (CPO)** to onboard **DAA** (Daily Active Agents). These agents need time to train in the network before they generate massive swarms of automated **Micro-transaction volume**. 
*   **How to Model It:** Treat this firmly as an energy-in vs. energy-out equation. Focus on *Tab 1 (Liquidity Target)* to figure out the exact baseline subsidies needed to keep the system powered.

---

## Explaining "Profile Decay Functions" (The Curve Shapes)

In **Tab 2 (Volatility vs. Stability Modeling)**, the app allows you to select the mathematical function that plots how rapidly your network decays. Here is what the different mathematical shapes represent behaviorally:

*   **`best_fit` (The Default):** The engine iterates through all mathematical curves and automatically picks the one that mathematically fits your Daily Retention inputs best.
*   **`log` (Logarithmic Decay):** Imagine a curve that drops fast early on, but then flattens out into a stable line that never quite hits zero. **Behavioral Match:** SaaS/Consumer Apps.
*   **`exp` (Exponential Decay):** A curve that plummets aggressively toward zero and gets there quickly. **Behavioral Match:** Rapid network flight after short-term incentives end.
*   **`power` (Power Law):** Extremely steep initial drop off that eventually settles into a stable, tiny fraction of power users (the "1% rule"). **Behavioral Match:** Social Networks and Creator Economies.
*   **`weibull`:** A highly flexible curve often used in engineering to model "time-to-failure." **Behavioral Match:** Hardware failure rates or deterministic bot/API token exhaustion.

---

## Core Dynamic Modules

1.  **Tab 1: Network Liquidity Target:** How much energy (budget/tokens) is required to hit a specific network size baseline?
2.  **Tab 2: Volatility vs. Stability Modeling:** What happens when catastrophic viral moments inject volatility into the system?
3.  **Tab 3: Cohort Maturity & Value Extraction:** When does the network actually generate yield? Calculates exactly how many units survive the decay curve long enough to trigger yield events (hitting a paywall or completing model training).

---

## Programmatic Capabilities & Data Export

While this app provides a Streamlit UI, the underlying engine supports programmatic use cases:
*   `engine.to_excel(df)` or `engine.to_json(df)`: Export raw cohort projections directly to your BI system.
*   `project_aged_DAU` or `project_exact_aged_DAU`: Perform deep Python segmentation to see exactly how many users are mathematically eligible for a specific product milestone based on their age in the network. 

---

## License & Attribution

This project is licensed under the [MIT License](LICENSE).

© 2026 False Dawn Industries.

The underlying modeling capabilities are provided by [`theseus_growth`](https://github.com/ESeufert/theseus_growth), an open-source MIT-licensed cohort analysis library. Copyright © 2020 Heracles LLC / Eric Benjamin Seufert. See `THIRD_PARTY_NOTICES.md` for full attribution.
