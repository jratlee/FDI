# ◒ False Dawn Industries | System Dynamics Engine

To bridge the gap between today’s aggregated marketing environments (SaaS, Mobile Apps) and the decentralized, AI-driven business models of tomorrow, you need to understand the physics of growth.

The underlying math of this engine—**compounding cohort decay**—is universal. It governs human attention just as perfectly as it governs machine uptime or capital liquidity.

## The Paradigm: Network Vitality

Whether you are acquiring a human subscriber, a decentralized compute node, or an autonomous AI agent, **every network experiences decay.** 

This engine is a **System Dynamics Engine**. It calculates the exact thermodynamic energy (marketing budget, token emissions, or compute subsidies) required to achieve system equilibrium. By elevating the language to system architecture, modern CMOs, Web3 founders, and AI economists can model and justify their acquisition strategies using identical physics.

## How to Deploy the Engine
1. Navigate to the repository directory.
2. Ensure dependencies are installed (`pip install -r requirements.txt`).
3. Launch the engine:
   ```bash
   streamlit run app.py
   ```

---

## ⚙️ Core Dynamic Modules

The application features a global **"Network Paradigm" Toggle**. Depending on whether you select *Aggregated Consumer/SaaS*, *Decentralized/Web3*, or *Autonomous AI Economy*, the entire suite dynamically updates its tracking metrics (from DAU to DAN, from Cost-Per-Install to Token Bounties).

### Module 1: Network Liquidity Target
**The Problem:** How much energy is required to hit a specific network size?
**The Dynamics:** Frame your target (e.g., 50,000 Daily Active Agents). The engine calculates the exact baseline daily injection of new units required to hit that metric equilibrium milestone, accounting for the natural decay (churn) of the network.

### Module 2: Volatility vs. Stability Modeling
**The Problem:** What happens when catastrophic viral moments inject volatility into the system?
**The Dynamics:** The engine visually pits a "cultural volatility moment" (a PR spike or mercenary airdrop) against a steady, programmatic drip. 

*Advanced:* You can actively manipulate the mathematical curve physics. Model human habituation using `log` (Logarithmic Decay), or model mercenary capital/airdrop farmers abandoning the network immediately using `exp` (Exponential Decay). This reveals how destructive volatile spikes can be if the underlying retention physics are poor.

### Module 3: Cohort Maturity & Value Extraction
**The Problem:** When does the network actually generate yield?
**The Dynamics:** Whether an AI agent takes 7 days to train in the environment before generating micro-transaction volume, or a human user takes 14 days before converting to a SaaS subscription, units must *mature* to generate value. This module calculates exactly how many units survive the decay curve long enough to trigger yield events.

---

## 🛠️ Programmatic Capabilities & Data Export

While this app provides a visual UI (Streamlit), the underlying engine supports deep programmatic usecases perfect for Analysts and Data Scientists.

### Exporting Projections
For those who want to take their projections and run them through their own financial models, the underlying `theseus_growth` engine comes out-of-the-box with two file output functions that can be incorporated into the app or run in an adjoining script:

*   `engine.to_excel(df, file_name='theseus_output.xlsx')`: Exports your forward projection dataframe directly as a `.xlsx` file.
*   `engine.to_json(df, file_name='theseus_output.json')`: Saves your forward projection dataframe as a `.json` file for programmatic ingestion into BI tools.

### Exact Age Segmentation
The engine allows you to do deep age-based segmentation via script. Often, certain monetization moments are only available to users *after some amount of time*. The engine contains highly specific age projection methods such as:
1.  **`project_aged_DAU`**: Calculates how many users are *at least* X days old on a given date.
2.  **`project_exact_aged_DAU`**: Calculates how many users are *exactly* X days old on a given date.

*Note: The underlying modeling capabilities are provided by [Theseus](https://github.com/ESeufert/theseus_growth), an MIT-licensed cohort analysis library developed by Eric Benjamin Seufert at Heracles.*
