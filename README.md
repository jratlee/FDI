# ◒ False Dawn Industries | Growth Engine

Imagine you have a lemonade stand, and you want to figure out how many people are going to come back tomorrow, next week, or next month. That's exactly what this app does, but for software apps!

This app helps us look into the future to guess things like:
- How much money we need to spend on ads.
- What happens if we get a huge shoutout on the news (a PR spike).
- How much money we might make from our super loyal customers.

## How to use it
1. Make sure you have python installed.
2. Open your terminal and run this command to start the app:
   ```bash
   streamlit run app.py
   ```
3. A webpage will automatically open in your browser!

---

## What do the different tabs mean?

### Tab 1: 🍋 The Goal (Budget)
*Also known as: Target Acquisition Simulator*

**What it means:** 
If you want to have exactly 50,000 people at your lemonade stand every single day, how many **new** people do you need to bring in today to reach that goal? And how much will it cost to put up enough flyers (ads) to get them?

**How to use it:**
Type in the number of people you want to have (Target DAU), how long you have to reach that goal, and how much it costs you to get one new person. The engine will tell you the total cost!

### Tab 2: 📰 The Mix (Earned vs Paid)
*Also known as: Multi-Channel & Earned Media Simulator*

**What it means:**
What is better? Setting up a small sign that brings in 100 people every day slowly, or getting on the local news channel and having 25,000 people show up all at once on a Tuesday? This tab draws a graph so you can literally *see* which one brings you more people in the long run.

**How to use it:**
Play with the sliders to change how many people come from daily ads vs. your big news channel spike. The graph will change shape to show you the winner.

### Tab 3: 💰 The Yield (Monetization)
*Also known as: Monetization Readiness*

**What it means:**
Let's say you only ask people for a donation if they come to your lemonade stand for 14 days in a row. How many people out of the thousands you brought in will actually stick around for 14 days? This tab tells you how many people survived long enough to actually pay you.

**How to use it:**
Tell the engine how many days it takes for a user to start paying, what percentage of people actually pay, and how much money they usually give. It will guess your total revenue!

---

## �� The Philosophy: Outcome-Oriented Modeling

This application is powered by the math inside [theseus_growth](https://github.com/ESeufert/theseus_growth), originally created by marketing expert Eric Seufert. While the original software was a powerful Python library built for data scientists, this interface democratizes that complex "cohort compounding" math so anyone can use it. 

In modern businesses, teams often work in silos and speak different languages:
*   **Marketing** speaks in "CPI" (Cost Per Install).
*   **Product** speaks in "Retention."
*   **Brand/PR** speaks in "Cultural Reach."
*   **Finance** speaks in "Yield" or "Revenue."

By pulling all these elements into one unified, visual model, this engine forces every discipline to look at how their specific lever impacts the **ultimate outcome**.

### Establishing a Business Benchmark
The true superpower of this software is establishing a **Baseline Benchmark Model** for a "normal" operating environment (e.g., *If we pay $2.50 per user, and 10% stay for 30 days, and 2% of survivors buy a $50 subscription, we survive*). 

Once that baseline is established, you can model massive cultural marketing outcomes against it.
*   **What if we go viral on TikTok?** You can model a massive acquisition spike with a steep drop-off retention curve to see if millions of views actually translate to lasting revenue compared to normal performance marketing.
*   **What if Product improves the Day-7 experience?** Marketing can instantly see that spending their exact same budget results in dramatically more active users simply because the retention curve flattened out.

This software proves that modern business models aren't driven by just marketing, just product, or just finance—they are driven by the compounding intersection of all three.

---

## ��️ Programmatic Capabilities & Data Export

While this app provides a visual UI (Streamlit), the underlying engine supports deep programmatic use cases perfect for Analysts and Data Scientists.

### Exporting Projections
For those who want to take their projections and run them through their own financial models, the underlying `theseus_growth` engine comes out-of-the-box with two file output functions that can be incorporated into the app or run in an adjoining script:

*   `engine.to_excel(df, file_name='theseus_output.xlsx')`: Exports your forward DAU projection dataframe directly as a `.xlsx` file.
*   `engine.to_json(df, file_name='theseus_output.json')`: Saves your forward projection dataframe as a `.json` file for programmatic ingestion into BI tools.

### Age-Based Cohort Segmentation
The engine allows you to do deep age-based segmentation. Often, certain monetization moments are only available to users *after some amount of time*. The engine contains highly specific age projection methods such as:
1.  **`project_aged_DAU`**: Calculates how many users are *at least* X days old on a given date.
2.  **`project_exact_aged_DAU`**: Calculates how many users are *exactly* X days old on a given date.

*Note: The underlying modeling capabilities are provided by [Theseus](https://github.com/ESeufert/theseus_growth), an MIT-licensed cohort analysis library developed by Eric Benjamin Seufert at Heracles.*
